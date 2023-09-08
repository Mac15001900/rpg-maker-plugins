//=============================================================================
// MAC_Extended_Loading_Screens.js
//=============================================================================

/*:
 * @plugindesc This plugin will make loading screens last longer, so that you can take a good look at them.
 * @author Mac15001900
 *
 * @help This plugin will make every loading screen last longer by a specified amount of time.
 * This is intended to help you with customising your loading screen, in case you're not
 * able to get a good look at it otherwise.
 * 
 * Simply set the 'Time' parameter to however long you'd like your loading screens to last.
 * Or set it to -1 to make them last forver.
 * 
 * Just remember to disable this plugin when you go back to working on something else!
 * 
 * This plugin is available under the MIT Licence. 
 * 
 * @param Time
 * @desc The extra time, in seconds, that every loading screen will last. -1 will make them last forever.
 * @default 5
 * 
 */

var Imported = Imported || {}
Imported['MAC_Extended_Loading_Screens'] = '1.0.0';

(function () {

    let params = PluginManager.parameters('MAC_Extended_Loading_Screens');
    let delay = Number(params['Time']) * 1000;
    if (delay < 0) delay = Infinity;
    console.log(delay);

    if (delay !== 0) { //The user might set the delay to 0 when they want to disable the plugin - in that case we won't be overwriting anything
        SceneManager.updateScene = function () {
            if (this._scene) {
                if (!this._sceneStarted && this._scene.isReady()) {
                    if (!this.waitUntil) {
                        this.waitUntil = Date.now() + delay;
                        return;
                    }
                    if (Date.now() < this.waitUntil) {
                        return;
                    }
                    this.waitUntil = null;
                    this._scene.start();
                    this._sceneStarted = true;
                    this.onSceneStart();
                }
                if (this.isCurrentSceneStarted()) {
                    this._scene.update();
                }
            }
        };
    }

})();
