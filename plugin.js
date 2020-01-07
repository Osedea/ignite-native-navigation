// Ignite CLI plugin for NativeNavigation
// ----------------------------------------------------------------------------
const NPM_MODULE_NAME = 'react-native-navigation';
const NPM_MODULE_VERSION = '^4.0.5';

const PLUGIN_PATH = __dirname;


const add = async function (context) {
    // Learn more about context: https://infinitered.github.io/gluegun/#/context-api.md
    const { ignite, filesystem, system, print } = context;
    const NPMPackage = await filesystem.read('package.json', 'json');
    const name = NPMPackage.name;

    if (NPMPackage.dependencies['react-native'] <= '0.51.0') {
        print.error('react-native-navigation is only supported on react-native versions greater than 0.51');
        process.exit();
    }
    let nodeV = await system.run('node -v', { trim: true });
    nodeV = nodeV.substring(1, nodeV.indexOf('.'));
    if (Number(nodeV) <= 8) {
        print.error('react-native-navigation requires node version to be greater than 8');
        process.exit();
    }


    ignite.addModule(NPM_MODULE_NAME, {
        link: false,
        version: NPM_MODULE_VERSION,
    });
    const spinner = context.print.spin('');
    spinner.start();
    spinner.stop();
    spinner.text = `patching android/app/build.gradle`;
    spinner.start();
    // // Android install.

    ignite.patchInFile(`${process.cwd()}/android/app/build.gradle`, {
        after: `targetSdkVersion rootProject.ext.targetSdkVersion`,
        insert: `        missingDimensionStrategy "RNN.reactNativeVersion", "reactNative60"`,
    });

    ignite.patchInFile(`${process.cwd()}/android/app/build.gradle`, {
        after: 'dependencies {',
        insert: `    implementation project(':react-native-navigation')`,
    });
    spinner.stop();

    spinner.text = `patching android/build.gradle`;
    spinner.start();

    ignite.patchInFile(`${process.cwd()}/android/build.gradle`, {
        replace: 'minSdkVersion = 16',
        insert: 'minSdkVersion = 19',
    });

    ignite.patchInFile(`${process.cwd()}/android/build.gradle`, {
        before: 'allprojects {',
        insert: `subprojects { subproject ->
    afterEvaluate {
        if ((subproject.plugins.hasPlugin('android') || subproject.plugins.hasPlugin('android-library'))) {
            android {
                variantFilter { variant ->
                    def names = variant.flavors*.name
                    if (
                        names.contains("reactNative51") ||
                        names.contains("reactNative55") ||
                        names.contains("reactNative56") ||
                        names.contains("reactNative57") ||
                        names.contains("reactNative57_5")
                    ) {
                        setIgnore(true)
                    }
                }
            }
        }
    }
}
`,
    });

    spinner.stop();
    spinner.text = `patching settings.gradle`;
    spinner.start();
    ignite.patchInFile(`${process.cwd()}/android/settings.gradle`, {
        after: `include ':app'`,
        insert: `include ':react-native-navigation'
project(':react-native-navigation').projectDir = new File(rootProject.projectDir, '../node_modules/react-native-navigation/lib/android/app/')`,
    });

    spinner.stop();
    spinner.text = `patching MainActivity.java`;
    spinner.start();

    ignite.patchInFile(`${process.cwd()}/android/app/src/main/java/com/${name.toLowerCase()}/MainActivity.java`, {
        replace: 'import com.facebook.react.ReactActivity;',
        insert: 'import com.reactnativenavigation.NavigationActivity;',
    });

    ignite.patchInFile(`${process.cwd()}/android/app/src/main/java/com/${name.toLowerCase()}/MainActivity.java`, {
        replace: 'public class MainActivity extends ReactActivity {',
        insert: 'public class MainActivity extends NavigationActivity {',
    });

    ignite.patchInFile(`${process.cwd()}/android/app/src/main/java/com/${name.toLowerCase()}/MainActivity.java`, {
        delete: '@Override',
    });

    spinner.stop();
    spinner.text = `patching MainApplication.java`;
    spinner.start();

    ignite.patchInFile(`${process.cwd()}/android/app/src/main/java/com/${name.toLowerCase()}/MainApplication.java`, {
        after: 'import com.facebook.soloader.SoLoader;',
        insert: `
import com.reactnativenavigation.NavigationApplication;
import com.reactnativenavigation.react.NavigationReactNativeHost;
import com.reactnativenavigation.react.ReactGateway;
`,
    });

    ignite.patchInFile(`${process.cwd()}/android/app/src/main/java/com/${name.toLowerCase()}/MainApplication.java`, {
        after: 'import java.util.List;',
        insert: `import java.util.Arrays;`,
    });

    ignite.patchInFile(`${process.cwd()}/android/app/src/main/java/com/${name.toLowerCase()}/MainApplication.java`, {
        replace: 'public class MainApplication extends Application implements ReactApplication {',
        insert: `public class MainApplication extends NavigationApplication {`,
    });

    ignite.patchInFile(`${process.cwd()}/android/app/src/main/java/com/${name.toLowerCase()}/MainApplication.java`, {
        after: 'public class MainApplication extends NavigationApplication {',
        insert: `
  @Override
  protected ReactGateway createReactGateway() {
      ReactNativeHost host = new NavigationReactNativeHost(this, isDebug(), createAdditionalReactPackages()) {
          @Override
          protected String getJSMainModuleName() {
              return "index";
          }
      };
      return new ReactGateway(this, isDebug(), host);
  }
  
  @Override
  public boolean isDebug() {
      return BuildConfig.DEBUG;
  }
  
  protected List<ReactPackage> getPackages() {
      // Add additional packages you require here
      // No need to add RnnPackage and MainReactPackage
      return Arrays.<ReactPackage>asList(
          // eg. new VectorIconsPackage()
      );
  }
  
  @Override
  public List<ReactPackage> createAdditionalReactPackages() {
      return getPackages();
  }
      
`,
    });

    spinner.stop();
    spinner.succeed();
    spinner.stop();
    spinner.text = 'Installing iOS ...';
    spinner.start();

    // add to pod
    ignite.patchInFile(`${process.cwd()}/ios/Podfile`, {
        after: `pod 'Folly', :podspec => '../node_modules/react-native/third-party-podspecs/Folly.podspec'`,
        insert: `
  pod 'ReactNativeNavigation', :podspec => '../node_modules/react-native-navigation/ReactNativeNavigation.podspec'
        `,
    });

    filesystem.copy(`${PLUGIN_PATH}/templates/AppDelegate.m`, `${process.cwd()}/ios/${name}/AppDelegate.m`, { overwrite: true });

    spinner.stop();
    spinner.text = 'Patching index.js ...';
    spinner.start();

    ignite.patchInFile(`${process.cwd()}/index.js`, {
        replace: `import {AppRegistry} from 'react-native';`,
        insert: `import { Navigation } from 'react-native-navigation';`,
    });

    ignite.patchInFile(`${process.cwd()}/index.js`, {
        delete: `import {name as appName} from './app.json';`,
    });

    ignite.patchInFile(`${process.cwd()}/index.js`, {
        delete: `AppRegistry.registerComponent(appName, () => App);`,
    });
    
    ignite.patchInFile(`${process.cwd()}/index.js`, {
        after: `import App from './App';`,
        insert: `
Navigation.registerComponent(\`navigation.playground.WelcomeScreen\`, () => App);

Navigation.events().registerAppLaunchedListener(() => {
  Navigation.setRoot({
    root: {
      component: {
        name: "navigation.playground.WelcomeScreen"
      }
    }
  });
});`,
    });

    spinner.succeed();

    spinner.stop();
    spinner.text = 'running pod install ...';
    spinner.start();

    system.run(`cd ${process.cwd()}/ios && pod install && cd ${process.cwd()}`);

    spinner.succeed();
};

/**
 * Remove yourself from the project.
 */
const remove = async function (context) {
    // Learn more about context: https://infinitered.github.io/gluegun/#/context-api.md
    const { ignite, print, filesystem } = context;

    const NPMPackage = await filesystem.read('package.json', 'json');
    const name = NPMPackage.name;
    const spinner = print.spin('Removing native-navigation');
    spinner.stop();
    spinner.text = 'patching app/build.gradle';
    spinner.start();

    ignite.patchInFile(`${process.cwd()}/android/app/build.gradle`, {
        delete: `        missingDimensionStrategy "RNN.reactNativeVersion", "reactNative60"`,
    });


    ignite.patchInFile(`${process.cwd()}/android/app/build.gradle`, {
        delete: `    implementation project(':react-native-navigation')`,
    });

    spinner.stop();
    spinner.text = 'patching build.gradle';
    spinner.start();

    ignite.patchInFile(`${process.cwd()}/android/build.gradle`, {
        replace: 'minSdkVersion = 19',
        insert: 'minSdkVersion = 16',
    });

    ignite.patchInFile(`${process.cwd()}/android/build.gradle`, {
        delete: `subprojects { subproject ->
    afterEvaluate {
        if ((subproject.plugins.hasPlugin('android') || subproject.plugins.hasPlugin('android-library'))) {
            android {
                variantFilter { variant ->
                    def names = variant.flavors*.name
                    if (
                        names.contains("reactNative51") ||
                        names.contains("reactNative55") ||
                        names.contains("reactNative56") ||
                        names.contains("reactNative57") ||
                        names.contains("reactNative57_5")
                    ) {
                        setIgnore(true)
                    }
                }
            }
        }
    }
}
`,
    });


    spinner.stop();
    spinner.text = 'patching settings.gradle';
    spinner.start();

    ignite.patchInFile(`${process.cwd()}/android/settings.gradle`, {
        delete: `include ':react-native-navigation'
project(':react-native-navigation').projectDir = new File(rootProject.projectDir, '../node_modules/react-native-navigation/lib/android/app/')`,
    });

    spinner.stop();
    spinner.text = 'patching MainActivity.java';
    spinner.start();

    ignite.patchInFile(`${process.cwd()}/android/app/src/main/java/com/${name.toLowerCase()}/MainActivity.java`, {
        replace: 'import com.reactnativenavigation.NavigationActivity;',
        insert: 'import com.facebook.react.ReactActivity;',
    });

    ignite.patchInFile(`${process.cwd()}/android/app/src/main/java/com/${name.toLowerCase()}/MainActivity.java`, {
        replace: 'public class MainActivity extends NavigationActivity {',
        insert: 'public class MainActivity extends ReactActivity {',
    });

    ignite.patchInFile(`${process.cwd()}/android/app/src/main/java/com/${name.toLowerCase()}/MainActivity.java`, {
        replace: 'protected String getMainComponentName() {',
        insert: `@Override
  protected String getMainComponentName() {`,
    });

    spinner.stop();
    spinner.text = 'patching MainApplication.java';
    spinner.start();

    ignite.patchInFile(`${process.cwd()}/android/app/src/main/java/com/${name.toLowerCase()}/MainApplication.java`, {
        delete: `
import com.reactnativenavigation.NavigationApplication;
import com.reactnativenavigation.react.NavigationReactNativeHost;
import com.reactnativenavigation.react.ReactGateway;
`,
    });

    ignite.patchInFile(`${process.cwd()}/android/app/src/main/java/com/${name.toLowerCase()}/MainApplication.java`, {
        delete: `import java.util.Arrays;`,
    });

    ignite.patchInFile(`${process.cwd()}/android/app/src/main/java/com/${name.toLowerCase()}/MainApplication.java`, {
        replace: `public class MainApplication extends NavigationApplication {`,
        insert: 'public class MainApplication extends Application implements ReactApplication {',
    });

    ignite.patchInFile(`${process.cwd()}/android/app/src/main/java/com/${name.toLowerCase()}/MainApplication.java`, {
        delete: `
  @Override
  protected ReactGateway createReactGateway() {
      ReactNativeHost host = new NavigationReactNativeHost(this, isDebug(), createAdditionalReactPackages()) {
          @Override
          protected String getJSMainModuleName() {
              return "index";
          }
      };
      return new ReactGateway(this, isDebug(), host);
  }
`,
    });

    ignite.patchInFile(`${process.cwd()}/android/app/src/main/java/com/${name.toLowerCase()}/MainApplication.java`, {
        delete: `
  protected List<ReactPackage> getPackages() {
      // Add additional packages you require here
      // No need to add RnnPackage and MainReactPackage
      return Arrays.<ReactPackage>asList(
          // eg. new VectorIconsPackage()
      );
  }`
    });

    ignite.patchInFile(`${process.cwd()}/android/app/src/main/java/com/${name.toLowerCase()}/MainApplication.java`, {
        delete: `
  @Override
  public boolean isDebug() {
      return BuildConfig.DEBUG;
  }`,
    });

    ignite.patchInFile(`${process.cwd()}/android/app/src/main/java/com/${name.toLowerCase()}/MainApplication.java`, {
        delete: `
  @Override
  public List<ReactPackage> createAdditionalReactPackages() {
      return getPackages();
  }`
    });
    spinner.stop();
    spinner.text = 'Removing iOS';
    spinner.stop();
    // iOS remove
    ignite.patchInFile(`${process.cwd()}/ios/Podfile`, {
        delete: `  pod 'ReactNativeNavigation', :podspec => '../node_modules/react-native-navigation/ReactNativeNavigation.podspec'`,
    });

    ignite.patchInFile(`${process.cwd()}/ios/${name}/AppDelegate.m`, {
        replace: `  NSURL *jsCodeLocation = [[RCTBundleURLProvider sharedSettings] jsBundleURLForBundleRoot:@"index" fallbackResource:nil];
  [ReactNativeNavigation bootstrap:jsCodeLocation launchOptions:launchOptions];`,
        insert:
        `  RCTBridge *bridge = [[RCTBridge alloc] initWithDelegate:self launchOptions:launchOptions];
  RCTRootView *rootView = [[RCTRootView alloc] initWithBridge:bridge
                                                   moduleName:@"${name}"
                                            initialProperties:nil];
        
  rootView.backgroundColor = [[UIColor alloc] initWithRed:1.0f green:1.0f blue:1.0f alpha:1];
        
  self.window = [[UIWindow alloc] initWithFrame:[UIScreen mainScreen].bounds];
  UIViewController *rootViewController = [UIViewController new];
  rootViewController.view = rootView;
  self.window.rootViewController = rootViewController;
  [self.window makeKeyAndVisible];
`,
    });

    ignite.patchInFile(`${process.cwd()}/ios/${name}/AppDelegate.m`, {
        delete: `#import <ReactNativeNavigation/ReactNativeNavigation.h>`,
    });

    spinner.succeed();

    // remove the npm module
    spinner.text = 'Unlinking module';
    spinner.start();
    await ignite.removeModule(NPM_MODULE_NAME, { unlink: false });
    spinner.succeed();
};

// Required in all Ignite CLI plugins
module.exports = {
    add,
    remove,
};

