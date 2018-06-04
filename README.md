# My Plugin

This plugin installs the [wix/react-native-navigation](https://github.com/wix/react-native-navigation)

The plugin creates 2 backup files called `MainApplication.old.java` and `AppDelegate.old.m` these will be used to restore your applicaiton to its original state shall you decided to remove the plugin. It is recommended that you commit these files.

## Example

```js
ignite add ignite-native-navigation
ignite remove ignite-native-navigation
```

