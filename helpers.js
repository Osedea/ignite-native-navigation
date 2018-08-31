function updateAndroidNavigationV1(context, name) {
    const { ignite } = context;

    ignite.patchInFile(`${process.cwd()}/android/app/build.gradle`, {
        replace: `compileSdkVersion 23`,
        insert: `compileSdkVersion 25`,
    });

    ignite.patchInFile(`${process.cwd()}/android/app/build.gradle`, {
        replace: `buildToolsVersion "23.0.1"`,
        insert: `buildToolsVersion "25.0.1"`,
    });

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
}

module.exports = {
    updateAndroidNavigationV1,
    updateGradleBuild,
};
