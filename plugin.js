// Ignite CLI plugin for NativeNavigation
// ----------------------------------------------------------------------------

const NPM_MODULE_NAME = 'react-native-navigation'
const NPM_MODULE_VERSION = 'latest'

// const PLUGIN_PATH = __dirname
// const APP_PATH = process.cwd()


const add = async function (context) {
  // Learn more about context: https://infinitered.github.io/gluegun/#/context-api.md
  const { ignite, print, filesystem } = context

  const NPMPackage = filesystem.read('package.json', 'json');
  const name = NPMPackage.name;
  const spinner = print.spin('setting up wix/react-native-navigation');
  // install an NPM module and link it
  await ignite.addModule(NPM_MODULE_NAME, { link: true, version: NPM_MODULE_VERSION })

  // install the module, android only.
  spinner.start();
  spinner.text = 'patching android/settings.gradle';
  ignite.patchInFile(`${process.cwd()}/android/settings.gradle`,{
    before: `include ':app'`,
    insert: `
    include ':react-native-navigation'
    project(':react-native-navigation').projectDir = new File(rootProject.projectDir, '../node_modules/react-native-navigation/android/app/')

    `, 
  });

  spinner.text = 'patching android/app/build.gradle';
  ignite.patchInFile(`${process.cwd()}/android/app/build.gradle`, {
    after: 'compile "com.facebook.react:react-native:+"',
    insert: 'compile project(\':react-native-navigation\')',
  });

  spinner.text = 'patching MainActivity.java';
  // import SplashActivity for wix native navigation
  ingnite.patchInFile(`${process.cwd()}/android/app/src/java/com/${name.toLowerCase()}/MainApplication.java`, {
    replace: 'import com.facebook.react.ReactActivity;',
    insert: 'import com.reactnativenavigation.controllers.SplashActivity;',
  });

  ingnite.patchInFile(`${process.cwd()}/android/app/src/java/com/${name.toLowerCase()}/MainApplication.java`, {
    replace: 'public class MainActivity extends ReactActivity {',
    insert: 'public class MainActivity extends SplashActivity {',
  });

  spinner.text = 'patching MainApplication.java';

  // import the NavigationApplication from reactnativenavigation package.
  ignite.patchInFile(`${process.cwd()}/android/app/src/java/com/MainApplication.java`, {
    after: 'import android.app.Application;',
    insert: 'import com.reactnativenavigation.NavigationApplication;'
  });
  
  ignite.patchInFile(`${process.cwd()}/android/app/src/java/com/MainApplication.java`, {
    replace: 'public class MainApplication extends Application implements ReactApplication {',
    insert: 'public class MainApplication extends NavigationApplication implements ReactApplication {',
  });

  // add methods to MainApplication
  ignite.patchInFile(`${process.cwd()}/android/app/src/java/com/MainApplication.java`, {
    after: 'private final ReactNativeHost mReactNativeHost = new ReactNativeHost(this) {',
    insert: `
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


  // Example of copying templates/NativeNavigation to App/NativeNavigation
  // if (!filesystem.exists(`${APP_PATH}/App/NativeNavigation`)) {
  //   filesystem.copy(`${PLUGIN_PATH}/templates/NativeNavigation`, `${APP_PATH}/App/NativeNavigation`)
  // }

  // Example of patching a file
  // ignite.patchInFile(`${APP_PATH}/App/Config/AppConfig.js`, {
  //   insert: `import '../NativeNavigation/NativeNavigation'\n`,
  //   before: `export default {`
  // })
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
  ingnite.patchInFile(`${process.cwd()}/android/app/src/java/com/${name.toLowerCase()}/MainApplication.java`, {
    replace: 'import com.reactnativenavigation.controllers.SplashActivity;',
    insert: 'import com.facebook.react.ReactActivity;',
  });

  ingnite.patchInFile(`${process.cwd()}/android/app/src/java/com/${name.toLowerCase()}/MainApplication.java`, {
    replace: 'public class MainActivity extends SplashActivity {',
    insert: 'public class MainActivity extends ReactActivity {',
  });

  spinner.text = 'patching MainApplication.java';

  // import the NavigationApplication from reactnativenavigation package.
  ignite.patchInFile(`${process.cwd()}/android/app/src/java/com/MainApplication.java`, {
    delete: 'import com.reactnativenavigation.NavigationApplication;',
  });
  
  ignite.patchInFile(`${process.cwd()}/android/app/src/java/com/MainApplication.java`, {
    replace: 'public class MainApplication extends NavigationApplication implements ReactApplication {',
    insert: 'public class MainApplication extends Application implements ReactApplication {',
  });

  // add methods to MainApplication
  ignite.patchInFile(`${process.cwd()}/android/app/src/java/com/MainApplication.java`, {
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
  await ignite.removeModule(NPM_MODULE_NAME, { unlink: true })

  

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

