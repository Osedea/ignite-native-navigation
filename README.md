# Ignite Native Navigation Plugin.

This plugin installs the [wix/react-native-navigation](https://github.com/wix/react-native-navigation)

The plugin creates 2 files `MainApplication.old` and `AppDelegate.old` these are backups of your files before they were modified by `react-native-link.` They are used by the `plugin.remove`to restore your applicaiton to its original state shall you decided to remove the plugin. It is recommended that you commit these files.

## Example

```js
ignite add ignite-native-navigation
ignite remove ignite-native-navigation
```

