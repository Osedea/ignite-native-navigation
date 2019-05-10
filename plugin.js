// Ignite CLI plugin for NativeNavigation
// ----------------------------------------------------------------------------
const NPM_MODULE_NAME = 'react-native-navigation';
let NPM_MODULE_VERSION = 'wix/react-native-navigation#d00bf22a1d7ceda61a8410c8f9db5a497c50c50f';

const helpers = require('./helpers');

const PLUGIN_PATH = __dirname;
// const APP_PATH = process.cwd()

const updateAndroidV1 = async (context, name) => {
    const { ignite } = context;
    await ignite.addModule(NPM_MODULE_NAME, { link: true, version: NPM_MODULE_VERSION });
    helpers.patchMainActivityV1(context, name);
    helpers.patchMainApplicationV1(context, name, PLUGIN_PATH);
};

const updateAndroidV2 = async (context, name, rnVersion) => {
    const { ignite } = context;
    await ignite.addModule(NPM_MODULE_NAME, { link: true, version: NPM_MODULE_VERSION });
    helpers.updateAndroidNavigationV2(context, name, PLUGIN_PATH, rnVersion);
};

const add = async function (context) {
    // Learn more about context: https://infinitered.github.io/gluegun/#/context-api.md
    const { ignite, filesystem, prompt } = context;
    const NPMPackage = await filesystem.read('package.json', 'json');
    const name = NPMPackage.name;

    let NativeNavigationV2 = false;
    // Android install.
    // prompt for react-native-navigation version.
    const answer = await prompt.ask({
        name: 'isV2',
        type: 'radio',
        message: 'Do you wish to use use React Native Navigation v2? (requires updating to gradle:3.0.1)',
        choices: ['Yes', 'No'],
    });
    NativeNavigationV2 = answer.isV2 === 'Yes';
    if (NativeNavigationV2) {
        // Gradle:3.0.1 install.
        // Special thanks to Justin Lane for his efforts in creating a React Native Navigation v2 plugin. (https://github.com/juddey).
        const answerSupportVersion = await prompt.ask({
            name: 'reactNativeSupportVersion',
            type: 'radio',
            message: 'Which version of React Native do you have installed?',
            choices: [
                'reactNative51 (Support for React Native 0.51 - 0.54)',
                'reactNative55',
                'reactNative56',
                'reactNative57',
                'reactNative57_5',
            ],
        });

        const supportVersion = answerSupportVersion.reactNativeSupportVersion.includes('reactNative51') ? 'reactNative51' : answerSupportVersion.reactNativeSupportVersion;
        updateAndroidV2(context, name, supportVersion);
        helpers.patchAppDelegateV2(context, name, PLUGIN_PATH);
    } else {
        // Insalling react-native-navigation v1
        NPM_MODULE_VERSION = 'wix/react-native-navigation#v1';
        updateAndroidV1(context, name);
        helpers.patchAppDelegateV1(context, name);
    }
};

/**
 * Remove yourself from the project.
 */
const remove = async function (context) {
    // Learn more about context: https://infinitered.github.io/gluegun/#/context-api.md
    const { ignite, print, filesystem } = context;

    const NPMPackage = await filesystem.read('package.json', 'json');
    const name = NPMPackage.name;
    const spinner = print.spin('reverting MainActivity.java');

    // import SplashActivity for wix native navigation
    ignite.patchInFile(`${process.cwd()}/android/app/src/main/java/com/${name.toLowerCase()}/MainActivity.java`, {
        replace: 'import com.reactnativenavigation.controllers.SplashActivity;',
        insert: 'import com.facebook.react.ReactActivity;',
    });

    ignite.patchInFile(`${process.cwd()}/android/app/src/main/java/com/${name.toLowerCase()}/MainActivity.java`, {
        replace: 'public class MainActivity extends SplashActivity {',
        insert: 'public class MainActivity extends ReactActivity {',
    });

    spinner.text = 'Restoring MainActivity.old';
    spinner.start();

    const backupMainApplication = await filesystem.read(`${process.cwd()}/android/app/src/main/java/com/${name.toLowerCase()}/MainApplication.old`);
    if (backupMainApplication) {
        await filesystem.file(`${process.cwd()}/android/app/src/main/java/com/${name.toLowerCase()}/MainApplication.java`, { content: backupMainApplication });
        await filesystem.remove(`${process.cwd()}/android/app/src/main/java/com/${name.toLowerCase()}/MainApplication.old`);
    } else {
        print.warning('Could not find MainApplicaiton.old in your project ... perhaps you removed it?');
    }
    spinner.succeed();
    spinner.text = 'Restoring AppDelegate.old';
    spinner.start();

    const backupAppDelegate = await filesystem.read(`${process.cwd()}/ios/${name.toLowerCase()}/AppDelegate.old`);

    if (backupAppDelegate) {
        await filesystem.file(`${process.cwd()}/ios/${name.toLowerCase()}/AppDelegate.m`, { content: backupAppDelegate });
        await filesystem.remove(`${process.cwd()}/ios/${name.toLowerCase()}/AppDelegate.old`);
    } else {
        print.warning('Could not find AppDelegate.old.m in your project ... perhaps you removed it?');
    }

    spinner.succeed();

    // remove the npm module
    spinner.text = 'Unlinking module';
    spinner.start();
    await ignite.removeModule(NPM_MODULE_NAME, { unlink: true, version: NPM_MODULE_VERSION });
    spinner.succeed();
};

// Required in all Ignite CLI plugins
module.exports = { add,
    remove };

