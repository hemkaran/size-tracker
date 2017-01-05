var nodegit = require("nodegit"),
    path = require("path"),
    exec = require('child-process-promise').exec,
    walker,
    historyCommits = [],
    sizes = [],
    sizediff,
    commit,
    latestCommitSize,
    tagCommitSize,
    tagCommitHash,
    latestTag,
    repo;

var fs = require('fs');
var path = require('path');

var branch = process.argv[3];
var filename = process.argv[4];
var historyFile = process.argv[4];

var root_path = process.argv[5];


if(process.argv[2] == "--local"){

  var pathToRepo =  require("path").resolve(root_path+"/.git");

  function getFilesizeInBytes(filename) {
      //filename = path.join(JSLIB_REPO_PATH, filename);
      var stats = fs.statSync(filename);
      var fileSizeInBytes = stats['size'];
      return (fileSizeInBytes)
  }


  /* to be taken by command line input */
  var filename = process.argv[4]
  //console.log(process.argv[0]);


  var localsize = getFilesizeInBytes(filename);

  nodegit.Repository.open(pathToRepo)
    .then(function(repo) {

      var checkoutOpts = {
        checkoutStrategy: nodegit.Checkout.STRATEGY.SAFE
      };
      repo.checkoutBranch(branch, checkoutOpts);
      return repo.getMasterCommit();
    })
    .then(function(firstCommitOnMaster) {
        return firstCommitOnMaster.getTree();
    })
    .then(function(tree) {
      // `walk()` returns an event.
      //if(tree.isTree()){
        var walker = tree.walk();
        walker.on("entry", function(entry) {

            //console.log(entry.path());

            // Patch the blob to contain a reference to the entry.
            entry.getBlob().then(function(blob) {
              console.log("hey");
                blob.entry = entry;
                //return blob;
                console.log(blob.entry.path() + "---" + blob.rawsize() + "b");
                if(blob.entry.path() == filename){
                  console.log("difference is"+(localsize - blob.rawsize()));
                }
            });
          
          // Display information about the blob.
          /*.then(function(blob) {
            // Show the path, sha, and filesize in bytes.
            console.log(blob.entry.path() + blob.entry.sha() + blob.rawsize() + "b");
            //console.log(entry.getBlob().rawsize());
              
            });*/
          });       
    //}

      // Don't forget to call `start()`!
      walker.start();
    })
    .done();





}else{


  // This code walks the history of the master branch and prints results
  // that look very similar to calling `git log` from the command line

  function compileHistory(resultingArrayOfCommits) {
    var lastSha;
    if (historyCommits.length > 0) {
      lastSha = historyCommits[historyCommits.length - 1].commit.sha();
      if (
        resultingArrayOfCommits.length == 1 &&
        resultingArrayOfCommits[0].commit.sha() == lastSha
      ) {
        return;
      }
    }

    console.log('one');
    console.log(resultingArrayOfCommits);
    resultingArrayOfCommits.forEach(function(entry) {
      historyCommits.push(entry);
    });

    console.log('two');
    console.log(historyCommits);
    lastSha = historyCommits[historyCommits.length - 1].commit.sha();

    console.log('three');

    walker = repo.createRevWalk();
    walker.push(lastSha);
    walker.sorting(nodegit.Revwalk.SORT.TIME);

    console.log('four');
    return walker.fileHistoryWalk(historyFile, 1)
      .then(compileHistory);
  }

  nodegit.Repository.open(path.resolve(root_path+"/.git"))
    .then(function(r) {
      repo = r;
      var checkoutOpts = {
        checkoutStrategy: nodegit.Checkout.STRATEGY.SAFE
      };
      repo.checkoutBranch(branch, checkoutOpts);
      return repo.getMasterCommit();
    })
    .then(function(firstCommitOnMaster){
      // History returns an event.
      walker = repo.createRevWalk();
      walker.push(firstCommitOnMaster.sha());
      walker.sorting(nodegit.Revwalk.SORT.Time);

      return walker.fileHistoryWalk(historyFile, 1);
    })
    .then(compileHistory)
    .then(function() {
      historyCommits.forEach(function(entry) {
        /*commit = entry.commit;
        console.log("commit " + commit.sha());
        console.log("Author:", commit.author().name() +
          " <" + commit.author().email() + ">");
        console.log("Date:", commit.date());
        console.log("\n    " + commit.message());
      });*/

      repo.getCommit(entry.commit)
      .then(function(commit) {
        return commit.getEntry(historyFile);
      })
      .then(function(entry) {

        entry.getBlob().then(function(blob) {
          latestCommitSize = blob.rawsize();
          console.log('latest commit size is' + blob.rawsize());
        });

      });

   
    exec('git --git-dir='+root_path+'/.git describe --abbrev=0 --tags').then(function(result){

      latestTag = result.stdout;
      console.log(latestTag);

      exec('git --git-dir='+root_path+'/.git rev-list -n 1 '+latestTag).then(function(result){

        tagCommitHash = result.stdout;
        console.log("step-1"+tagCommitHash);
          
          repo.getCommit(tagCommitHash).then(function(commit) {
            return commit.getEntry(historyFile);
          })
          .then(function(entry) {

    
            entry.getBlob().then(function(blob) {
              tagCommitSize = blob.rawsize();
              console.log('tag filesize is' + blob.rawsize());

                  sizediff = Math.abs(tagCommitSize - latestCommitSize);
                  if(tagCommitSize > latestCommitSize){

                    console.log('you file is smaller than the last tagged commit by' + sizediff + "bytes");

                  }else{

                    console.log('you file is larger than the last tagged commit by' + sizediff + "bytes");

                  }
            });

          });
      });
    });

    });



    })
    .done();





}

