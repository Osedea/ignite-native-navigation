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
  const NPMPackage = filesystem.read('package.json', 'json');
  const name = NPMPackage.name;
  // install an NPM module and link it
  await ignite.addModule(NPM_MODULE_NAME)

  // install the module, android only.
  ignite.patchInFile(`${process.cwd()}/android/settings.gradle`,{
    before: `include ':app'`,
    insert: `include ':react-native-navigation'
    project(':react-native-navigation').projectDir = new File(rootProject.projectDir, '../node_modules/react-native-navigation/android/app/')

    `, 
  });

  ignite.patchInFile(`${process.cwd()}/android/app/build.gradle`, {
    after: 'compile "com\\.facebook\\.react:react-native',
    insert: 'compile project(\':react-native-navigation\')',
  });

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
  await filesystem.file(`${process.cwd()}/android/app/src/main/java/com/${name.toLowerCase()}/MainApplication.old.java`, { content: oldMainApplication });
  
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
  print.debug(`plugin path: ${PLUGIN_PATH}`);
  print.debug(`process cwd: ${process.cwd()}`);
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
}

/**
 * Remove yourself from the project.
 */
const remove = async function (context) {
  // Learn more about context: https://infinitered.github.io/gluegun/#/context-api.md
  const { ignite, pint, filesystem } = context
  const spinner = print.spin('removing react-native-navigation plugin');

  const NPMPackage = filesystem.read('package.json', 'json');
  const name = NPMPackage.name;
  spinner.start();
  spinner.text = 'starting removal process ...'
  ignite.patchInFile(`${process.cwd()}/android/settings.gradle`, {
    delete: `
    include ':react-native-navigation'
    project(':react-native-navigation').projectDir = new File(rootProject.projectDir, '../node_modules/react-native-navigation/android/app/')
    `,
  });

  ignite.patchInFile(`${process.cwd()}/android/settings.gradle`, {
    delete: `compile project(\':react-native-navigation\')`,
  });

  spinner.text = 'patching MainActivity.java';
  // import SplashActivity for wix native navigation
  ignite.patchInFile(`${process.cwd()}/android/app/src/main/java/com/${name.toLowerCase()}/MainApplication.java`, {
    replace: 'import com.reactnativenavigation.controllers.SplashActivity;',
    insert: 'import com.facebook.react.ReactActivity;',
  });

  ignite.patchInFile(`${process.cwd()}/android/app/src/main/java/com/${name.toLowerCase()}/MainApplication.java`, {
    replace: 'public class MainActivity extends SplashActivity {',
    insert: 'public class MainActivity extends ReactActivity {',
  });

  spinner.text = 'patching MainApplication.java';

  // import the NavigationApplication from reactnativenavigation package.
  ignite.patchInFile(`${process.cwd()}/android/app/src/main/java/com/${name.toLowerCase()}/MainApplication.java`, {
    delete: 'import com.reactnativenavigation.NavigationApplication;',
  });
  
  ignite.patchInFile(`${process.cwd()}/android/app/src/main/java/com/${name.toLowerCase()}/MainApplication.java`, {
    replace: 'public class MainApplication extends NavigationApplication implements ReactApplication {',
    insert: 'public class MainApplication extends Application implements ReactApplication {',
  });

  // add methods to MainApplication
  ignite.patchInFile(`${process.cwd()}/android/app/src/main/java/com/${name.toLowerCase()}/MainApplication.java`, {
   delete: `
    @Override
    public boolean isDebug() {
        // Make sure you are using BuildConfig from your own application
        return BuildConfig.DEBUG;
    }

    @Override
     public List<ReactPackage> createAdditionalReactPackages() {
         return getPackages();
     }
    `,
  })

  // remove the npm module and unlink it
  await ignite.removeModule(NPM_MODULE_NAME)

  

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

