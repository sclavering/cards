const kDisplayName = "Cards";
const kName = "cards";
const kPackage = "/cardgames.mozdev.org/cards";
const kVersion = "0.99";

const kJarFile = "cards.zip";
const kContentFolder = "code/";
const kLocaleFolders  = ["lang/en/"];
const kSkinFolder = "";

function die(err) {
  alert("Install failed. Error code:" + err);
  cancelInstall(err);
}

initInstall(kName, kPackage, kVersion);

const folder = getFolder("Profile", "chrome");

var err = addFile(kPackage, kVersion, kJarFile, folder, null)
if(err == SUCCESS) {
  var jar = getFolder(folder, kJarFile)
  registerChrome(CONTENT | PROFILE_CHROME, jar, kContentFolder);
  for(var i in kLocaleFolders) registerChrome(LOCALE | PROFILE_CHROME, jar, kLocaleFolders[i]);
  if(kSkinFolder) registerChrome(SKIN | PROFILE_CHROME, jar, kSkinFolder);
  err = performInstall();
  if(err != SUCCESS && err != 999) die(err);
} else {
  die(err);
}
