// Ignite CLI plugin for NativeNavigation
// ----------------------------------------------------------------------------
const Mustache = require('mustache');

const NPM_MODULE_NAME = 'react-native-navigation'
const NPM_MODULE_VERSION = 'latest'

const PLUGIN_PATH = __dirname
// const APP_PATH = process.cwd()


const add = async function (context) {
  // Learn more about context: https://infinitered.github.io/gluegun/#/context-api.md
  const { ignite, print, filesystem, patching } = context
  const NPMPackage = await filesystem.read('package.json', 'json');
  const name = NPMPackage.name;

  // Android install.

  // import SplashActivity for wix native navigation
  ignite.patchInFile(`${process.cwd()}/android/app/src/main/java/com/${name.toLowerCase()}/MainActivity.java`, {
    replace: 'import com\.facebook\.react\.ReactActivity;',
    insert: 'import com.reactnativenavigation.controllers.SplashActivity;',
  });

  ignite.patchInFile(`${process.cwd()}/android/app/src/main/java/com/${name.toLowerCase()}/MainActivity.java`, {
    replace: 'public class MainActivity extends ReactActivity {',
    insert: 'public class MainActivity extends SplashActivity {',
  });

  const oldMainApplication = await filesystem.read(`${process.cwd()}/android/app/src/main/java/com/${name.toLowerCase()}/MainApplication.java`);
  // run react-native link after we read the old file data as it will generate new faulty imports
  await filesystem.file(`${process.cwd()}/android/app/src/main/java/com/${name.toLowerCase()}/MainApplication.old.java`, { content: oldMainApplication });
  // install an NPM module and link it
  await ignite.addModule(NPM_MODULE_NAME, { link: true });
  
  // some substr & substring hackery.
  const ASLIST = 'asList(';
  const restOfFile = oldMainApplication.substr(oldMainApplication.indexOf(ASLIST));
  
  // get the first occuring ); after the asList method declaration.
  const closeIndex = restOfFile.indexOf(');');
  const packages = restOfFile.substring(restOfFile.indexOf(ASLIST) + ASLIST.length + 1, closeIndex);
  
  let splitPackages = packages.trim();

  // import statements
  const imports = oldMainApplication.match(/^import.*$/gm).join('\n');

  // onCreate
  let onCreate;
  if (oldMainApplication.match(/public void onCreate\(\) {[\s\S]*.}/g).length) {
    onCreate = oldMainApplication.match(/public void onCreate\(\) {[\s\S]*.}/g);
  }

  // build new MainApplication.java

  const template = `MainApplication.java.ejs`
  const target = `android/app/src/main/java/com/${name.toLowerCase()}/MainApplication.java`;
  const props = {
    packages: splitPackages,
    packageName: name.toLowerCase(),
    imports: imports,
    onCreate,
  };

  await context.template.generate({
    template,
    target,
    props,
    directory: `${PLUGIN_PATH}/templates`,
  });

  // iOS install
  const additions = `  self.window = [[UIWindow alloc] initWithFrame:[UIScreen mainScreen].bounds];
  self.window.backgroundColor = [UIColor whiteColor];
  [[RCCManager sharedInstance] initBridgeWithBundleURL:jsCodeLocation launchOptions:launchOptions];
  `;
  let iOSAppDelegate = await filesystem.read(`${process.cwd()}/ios/${name.toLowerCase()}/AppDelegate.m`);
  // create a backup of AppDelegate.m
  await filesystem.file(`${process.cwd()}/ios/${name.toLowerCase()}/AppDelegate.old.m`, { content: iOSAppDelegate });
  
  iOSAppDelegate = iOSAppDelegate.replace(/^[\s].*RCTRootView.*(\r\n|\n|\r)/gm, '');
  iOSAppDelegate = iOSAppDelegate.replace(new RegExp(`^.*moduleName:@"${name.toLowerCase()}".*(\r\n|\n|\r)`, 'gm'), '');
  iOSAppDelegate = iOSAppDelegate.replace(/^.*initialProperties:nil.*(\r\n|\n|\r)/gm, '');
  iOSAppDelegate = iOSAppDelegate.replace(/^.*launchOptions:launchOptions];.*(\r\n|\n|\r)/gm, '');
  iOSAppDelegate = iOSAppDelegate.replace(/^.*rootView\.backgroundColor = \[\[UIColor alloc\] initWithRed:1\.0f green:1\.0f blue:1\.0f alpha:1\];.*(\r\n|\n|\r)/gm, '');
  iOSAppDelegate = iOSAppDelegate.replace(/^.*self\.window = \[\[UIWindow alloc\] initWithFrame:\[UIScreen mainScreen\]\.bounds\];.*(\r\n|\n|\r)/gm, '');
  iOSAppDelegate = iOSAppDelegate.replace(/^.*UIViewController \*rootViewController = \[UIViewController new\];.*(\r\n|\n|\r)/gm, '');
  iOSAppDelegate = iOSAppDelegate.replace(/^.*rootViewController\.view = rootView;.*(\r\n|\n|\r)/gm, '');
  iOSAppDelegate = iOSAppDelegate.replace(/^.*self\.window\.rootViewController = rootViewController;.*(\r\n|\n|\r)/gm, '');
  iOSAppDelegate = iOSAppDelegate.replace(/^.*\[self\.window makeKeyAndVisible\];\.*(\r\n|\n|\r)/gm, additions);
  
  await filesystem.file(`${process.cwd()}/ios/${name.toLowerCase()}/AppDelegate.m`, { content: iOSAppDelegate });

  ignite.patchInFile(`${process.cwd()}/ios/${name.toLowerCase()}/AppDelegate.m`, {
    after: '#import <React/RCTBundleURLProvider.h>',
    insert: '\n#import "RCCManager.h"', 
  })
}

/**
 * Remove yourself from the project.
 */
const remove = async function (context) {
  // Learn more about context: https://infinitered.github.io/gluegun/#/context-api.md
  const { ignite, print, filesystem } = context

  const NPMPackage = await filesystem.read('package.json', 'json');
  const name = NPMPackage.name;
  const spinner = print.spin('remove native files patches');
  // print.info('here')
  // import SplashActivity for wix native navigation
  // ignite.patchInFile(`${process.cwd()}/android/app/src/main/java/com/${name.toLowerCase()}/MainActivity.java`, {
  //   replace: 'import com.reactnativenavigation.controllers.SplashActivity;',
  //   insert: 'import com.facebook.react.ReactActivity;',
  // });

  // ignite.patchInFile(`${process.cwd()}/android/app/src/main/java/com/${name.toLowerCase()}/MainActivity.java`, {
  //   replace: 'public class MainActivity extends SplashActivity {',
  //   insert: 'public class MainActivity extends ReactActivity {',
  // });

  // const backupMainApplication = await filesystem.read(`${process.cwd()}/android/app/src/main/java/com/${name.toLowerCase()}/MainApplication.old.java`);
  // if (backupMainApplication) {
  //   await filesystem.file(`${process.cwd()}/android/app/src/main/java/com/${name.toLowerCase()}/MainApplication.java`, { content: backupMainApplication });
  //   await filesystem.remove(`${process.cwd()}/android/app/src/main/java/com/${name.toLowerCase()}/MainApplication.old.java`)
  // } else {
  //   print.warning('Could not find MainActivity.old.java in your project ... perhaps you removed it?')
  // }

  // const backupAppDelegate = await filesystem.read(`${process.cwd()}/ios/${name.toLowerCase()}/AppDelegate.old.m`);
  
  // if (backupAppDelegate) {
  //   await filesystem.file(`${process.cwd()}/ios/${name.toLowerCase()}/AppDelegate.m`, { content: backupAppDelegate });
  //   await filesystem.remove(`${process.cwd()}/ios/${name.toLowerCase()}/AppDelegate.old.m`);
  // } else {
  //   print.warning('Could not find AppDelegate.old.m in your project ... perhaps you removed it?')
  // }

  // remove the npm module
  // await ignite.removeModule(NPM_MODULE_NAME, { unlink: true });

  // Example of removing App/NativeNavigation folder
  // const removeNativeNavigation = await context.prompt.confirm(
  //   'Do you want to remove App/NativeNavigation?'
  // )
  // if (removeNativeNavigation) { filesystem.remove(`${APP_PATH}/App/NativeNavigation`) }

  // Example of unpatching a file
  // ignite.patchInFile(`${APP_PATH}/App/Config/AppConfig.js`, {
  //   delete: `import '../NativeNavigation/NativeNavigation'\n`
  // )
}

// Required in all Ignite CLI plugins
module.exports = { add, remove }

