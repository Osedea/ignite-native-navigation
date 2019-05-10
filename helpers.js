function patchMainActivityV1(context, name) {
    const { ignite, print } = context;

    print.warning(`Make sure you're using react-navtive version 0.51.+`);
    print.warning('Ensure that `compileSdkVersion` and `buildToolsVersion` are greater than 25 in app/build.gradle');

    // import SplashActivity for wix native navigation
    ignite.patchInFile(`${process.cwd()}/android/app/src/main/java/com/${name.toLowerCase()}/MainActivity.java`, {
        replace: 'import com.facebook.react.ReactActivity;',
        insert: 'import com.reactnativenavigation.controllers.SplashActivity;',
    });

    ignite.patchInFile(`${process.cwd()}/android/app/src/main/java/com/${name.toLowerCase()}/MainActivity.java`, {
        replace: 'public class MainActivity extends ReactActivity {',
        insert: 'public class MainActivity extends SplashActivity {',
    });

    ignite.patchInFile(`${process.cwd()}/android/app/src/main/java/com/${name.toLowerCase()}/MainActivity.java`, {
        delete: '@Override',
    });
}

/**
 * Patch the MainApplication.java file.
 */
async function patchMainApplicationV1(context, name, PLUGIN_PATH) {
    const { ignite, filesystem, print } = context;

    const oldMainApplication = await filesystem.read(`${process.cwd()}/android/app/src/main/java/com/${name.toLowerCase()}/MainApplication.java`);
    // run react-native link after we read the old file data as it will generate new faulty imports
    await filesystem.file(`${process.cwd()}/android/app/src/main/java/com/${name.toLowerCase()}/MainApplication.old`, { content: oldMainApplication });

    // some substr & substring hackery.
    const ASLIST = 'asList(';
    const restOfFile = oldMainApplication.substr(oldMainApplication.indexOf(ASLIST));

    // get the first occuring ); after the asList method declaration.
    const closeIndex = restOfFile.indexOf(');');
    const packages = restOfFile.substring(restOfFile.indexOf(ASLIST) + ASLIST.length + 1, closeIndex);
    // react native link imports packages that do not exist.
    let splitPackages = packages.trim();
    const badPackage = 'new NavigationReactPackage()';
    const start = splitPackages.substr(0, splitPackages.indexOf(badPackage) - 14);
    const end = splitPackages.substr(splitPackages.indexOf(badPackage) + badPackage.length);

    splitPackages = start + end;

    // import statements
    let imports = oldMainApplication.match(/^import.*$/gm);
    // react-native link react-native-navigation in V1 imports a faulty package.
    const index = imports.indexOf('import com.reactnativenavigation.NavigationReactPackage;');
    if (index >= 0) {
        imports.splice(index, 1);
    }
    imports = imports.join('\n');


    // onCreate
    let onCreate;
    if (oldMainApplication.match(/public void onCreate\(\) {[\s\S]*.}/g).length) {
        onCreate = oldMainApplication.match(/public void onCreate\(\) {[\s\S]*.}/g);
    }

    // build new MainApplication.java
    const mainApplicationTemplate = `MainApplication.java.ejs`;
    const mainApplicationTarget = `android/app/src/main/java/com/${name.toLowerCase()}/MainApplication.java`;
    const mainApplicationProps = {
        packages: splitPackages,
        packageName: name.toLowerCase(),
        imports,
        onCreate,
    };

    await context.template.generate({
        template: mainApplicationTemplate,
        target: mainApplicationTarget,
        props: mainApplicationProps,
        directory: `${PLUGIN_PATH}/templates/v1`,
    });
}

async function patchAppDelegateV1(context, name) {
    const { ignite, filesystem } = context;
    const iOSAppDelegate = filesystem.read(`${process.cwd()}/ios/${name.toLowerCase()}/AppDelegate.m`);
    // create a backup of AppDelegate.m
    await filesystem.file(`${process.cwd()}/ios/${name.toLowerCase()}/AppDelegate.old`, { content: iOSAppDelegate });
    ignite.patchInFile(`${process.cwd()}/ios/${name.toLowerCase()}/AppDelegate.m`, {
        after: '#import <React/RCTBundleURLProvider.h>',
        insert: '\n#import "RCCManager.h"',
    });

    ignite.patchInFile(`${process.cwd()}/ios/${name.toLowerCase()}/AppDelegate.m`, {
        before: 'return YES;',
        insert: '  [[RCCManager sharedIntance] initBridgeWithDelegate:self launchOptions:launchOptions];\n',
    });
}

async function updateAndroidNavigationV2(context, name, PLUGIN_PATH, rnversion) {
    const { ignite, filesystem } = context;
    // eslint-disable-next-line no-template-curly-in-string
    const supportLibVersionString = "${rootProject.ext.supportLibVersion}";

    ignite.patchInFile(`${process.cwd()}/android/settings.gradle`, {
        before: `include ':app'`,
        insert: `include ':react-native-navigation'
        project(':react-native-navigation').projectDir = new File(rootProject.projectDir, '../node_modules/react-native-navigation/lib/android/app/')\n`,
    });

    ignite.patchInFile(`${process.cwd()}/android/build.gradle`, {
        replace: `        minSdkVersion = 16`,
        insert: `        minSdkVersion = 18`,
    });

    ignite.patchInFile(`${process.cwd()}/android/build.gradle`, {
        after: `        google()`,
        insert: `        mavenLocal()
        mavenCentral()`,
    });

    ignite.patchInFile(`${process.cwd()}/android/build.gradle`, {
        before: `        maven {`,
        insert: `        maven { url 'https://jitpack.io' }`,
    });

    ignite.patchInFile(`${process.cwd()}/android/app/build.gradle`, {
        after: `dependencies {`,
        insert: `implementation project(':react-native-navigation')`,
    });

    ignite.patchInFile(`${process.cwd()}/android/app/build.gradle`, {
        after: `targetSdkVersion rootProject.ext.targetSdkVersion`,
        insert: `missingDimensionStrategy "RNN.reactNativeVersion", "${rnversion}"`,
    });

    ignite.patchInFile(`${process.cwd()}/android/build.gradle`, {
        before: `allprojects {`,
        insert: `subprojects { subproject ->
                afterEvaluate {
                    if ((subproject.plugins.hasPlugin('android') || subproject.plugins.hasPlugin('android-library'))) {
                        android {
                            variantFilter { variant ->
                                def names = variant.flavors*.name
                                if (names.contains("reactNative51") || names.contains("reactNative55")) {
                                    setIgnore(true)
                                }
                            }
                        }
                    }
                }
            }\n`,
    });

    // Patch MainActivity
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

    // Patch MainApplication
    // build new MainApplication.java
    
    const oldMainApplication = await filesystem.read(`${process.cwd()}/android/app/src/main/java/com/${name.toLowerCase()}/MainApplication.java`);
    // some substr & substring hackery.
    const ASLIST = 'asList(';
    const restOfFile = oldMainApplication.substr(oldMainApplication.indexOf(ASLIST));

    // get the first occuring ); after the asList method declaration.
    const closeIndex = restOfFile.indexOf(');');
    const packages = restOfFile.substring(restOfFile.indexOf(ASLIST) + ASLIST.length + 1, closeIndex);
    // react native link imports packages that do not exist.
    const splitPackages = packages.trim();

    const imports = oldMainApplication.match(/^import.*$/gm).join('\n');

    // onCreate
    let onCreate;
    if (oldMainApplication.match(/public void onCreate\(\) {[\s\S]*.}/g).length) {
        onCreate = oldMainApplication.match(/public void onCreate\(\) {[\s\S]*.}/g);
    }

    const mainApplicationTemplate = `MainApplication.java.ejs`;
    const mainApplicationTarget = `android/app/src/main/java/com/${name.toLowerCase()}/MainApplication.java`;
    const mainApplicationProps = {
        packages: splitPackages,
        packageName: name.toLowerCase(),
        imports,
        onCreate,
    };

    await context.template.generate({
        template: mainApplicationTemplate,
        target: mainApplicationTarget,
        props: mainApplicationProps,
        directory: `${PLUGIN_PATH}/templates/v2`,
    });
}

async function patchAppDelegateV2(context, name, PLUGIN_PATH) {
    const { ignite, filesystem, print } = context;
    const iOSAppDelegate = filesystem.read(`${process.cwd()}/ios/${name.toLowerCase()}/AppDelegate.m`);
    // create a backup of AppDelegate.m
    await filesystem.file(`${process.cwd()}/ios/${name.toLowerCase()}/AppDelegate.old`, { content: iOSAppDelegate });

    // ignite.patchInFile(`${process.cwd()}/ios/${name.toLowerCase()}/AppDelegate.m`, {
    //     before: `  return YES;`,
    //     insert: `  [ReactNativeNavigation bootstrap:jsCodeLocation launchOptions:launchOptions];\n`,
    // });
    await context.template.generate({
        template: 'AppDelegate.m.ejs',
        target: `ios/${name}/AppDelegate.m`,
        directory: `${PLUGIN_PATH}/templates/v2`,
    });
    print.warning('Ensure that the ReactNativeNavigation.xcodeproj is under Libraries');
    print.warning('Ensure that libReactNativeNavigation.a exists in the Link Binary With Libraries');
}

/**
 * Update gradle 2 to gradle 3
 * Primarily replaces all dependencies using compile.
 * @param {*} context
 */
function updateGradleBuild(context) {
    const { filesystem } = context;
    let androidAppBuildGradle = filesystem.read(`${process.cwd()}/android/app/build.gradle`, 'utf8');
    androidAppBuildGradle = androidAppBuildGradle.replace(/(compile )g/, (match, param, offset, string) => {
        const charAfterCompile = string.substr(offset + match.length, 1);
        if (charAfterCompile === '"' || charAfterCompile === 'p') {
            return 'implementation ';
        }

        return match;
    });
    filesystem.file(`${process.cwd()}/android/app/build.gradle`, { content: androidAppBuildGradle });

    // ensure package grade-4.4-all
    let gradleProperties = filesystem.read(`${process.cwd()}/android/gradle/wrapper/gradle-wrapper.properties`, 'utf-8');
    gradleProperties = gradleProperties.replace(/(distributionUrl=https).*/, 'distributionUrl=https\\://services.gradle.org/distributions/gradle-4.4-all.zip');
    filesystem.file(`${process.cwd()}/android/gradle/wrapper/gradle-wrapper.properties`, { content: gradleProperties });
}

function patchGradle(context, name, isVerson1) {
    const { ignite } = context;

    const projectString = isVerson1 ? `include ':react-native-navigation'
    project(':react-native-navigation').projectDir = new File(rootProject.projectDir, '../node_modules/react-native-navigation/android/app/')`
        : `include ':react-native-navigation'
    project(':react-native-navigation').projectDir = new File(rootProject.projectDir, '../node_modules/react-native-navigation/lib/android/app/')`;

    ignite.patchInFile(`${process.cwd()}/android/app/build.gradle`, {
        after: 'dependencies {',
        insert: 'implementation project(\':react-native-navigation\')',
    });

    ignite.patchInFile(`${process.cwd()}/android/settings.gradle`, {
        after: `rootProject.name = '${name}'`,
        insert: projectString,
    });
}

module.exports = {
    patchMainActivityV1,
    updateGradleBuild,
    patchMainApplicationV1,
    patchAppDelegateV1,
    patchGradle,
    updateAndroidNavigationV2,
    patchAppDelegateV2,
};
