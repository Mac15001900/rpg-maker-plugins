//=============================================================================
// MAC_Camera_Look_Ahead.js
//=============================================================================

/*:
 * @plugindesc Still very much in the experimental phase, but it mostly works. When the player is stopped, it centers the camera on the tile in front of them. 
 * @author Mac15001900
 *
 * @help I've tested this plugin a bit, and it *should* work with different 
 * resolutions and weird things like looping maps etc, but I can't guarantee that.
 * Provides four plugins commands:
 * 
 * EnableLookAhead - enables the plugin
 * 
 * DisableLookAhead - disables the plugin, recommended for cutscenes where you 
 * manually move the camera around
 * 
 * RestoreCamera - Moves the camera to center on the player again. I'd recommend 
 * to only use it after 'DisableLookAhead', because otherwise the camera will 
 * just move back :P
 * 
 * SetLookAheadSpeed x - Sets the scroll speed to x, works the same as 
 * changing the "Speed" parameter.
 * 2 - four time as slow as default player speed
 * 3 - twice as slow as default player speed
 * 4 - the same as default player speed
 * 5 - twice as fast as default player speed
 * 6 - four times as fast as default player speed
 * etc. higher and lower values are also possible, as well as fractional values
 * 0 - special, will always be the same as player's current speed
 * 
 * 
 * @param Enable by default
 * @desc Should the plugin be enabled when the game starts
 * @type Boolean
 * @default true
 * 
 * @param Speed
 * @desc How fast the camera scrolls. Works the same as character speed. Will use player's speed when set to 0.
 * @default 0
 * 
 */
var Imported = Imported || {}
Imported['MAC_Camera_Look_Ahead'] = '1.1.0';


(function () {

    let params = PluginManager.parameters('MAC_Camera_Look_Ahead');
    let enabled = params['Enable by default'] === "true";

    let speed = Number(params['Speed']);
    if (speed < 0) throw new Exception('Camera scroll speed cannot be negative.');
    if (speed > 8) speed = 8; //At this point it's instant anyway, higher values can yeet the camera way too far

    let restoringInProgress = false;

    //Aliasing Game_Interpreter.pluginCommand to add our commands
    var _Game_Interpreter_pluginCommand = Game_Interpreter.prototype.pluginCommand;
    Game_Interpreter.prototype.pluginCommand = function (command, args) {
        _Game_Interpreter_pluginCommand.call(this, command, args);
        switch (command) {
            case 'EnableLookAhead': enabled = true; break;
            case 'DisableLookAhead': enabled = false; break;
            case 'RestoreCamera': restoringInProgress = true; break;
            case 'SetLookAheadSpeed': speed = Number(args[0]); break;
        }
    };

    //A directions enum, correspodning to RPG Maker's direction values
    let Direction = {
        NONE: 0,
        DOWN: 2,
        LEFT: 4,
        RIGHT: 6,
        UP: 8,
    };

    //Aliasing Game_Player.update to add all the needed camera motions
    var _Game_Player_update = Game_Player.prototype.update;
    Game_Player.prototype.update = function (sceneActive) {
        _Game_Player_update.call(this, sceneActive);
        if (restoringInProgress) {
            if (this.restoreCamera()) restoringInProgress = false; //restoreCamera will return 'true' if successful
            return;
        }
        if (!enabled) return;

        if (this.cameraOffset === undefined) this.cameraOffset = Direction.NONE;

        if (this.offsetNextFrame) {
            if ($gameMap.isScrolling()) return; //We'll wait until this is done.
            if (!this.isMoving() && $gameMap.canScroll(this.direction()) && $gameMap.canScroll(reverseDirection(this.direction()))) {
                $gameMap.startScroll(this.direction(), 1, speed || this.moveSpeed());
                $gamePlayer.cameraOffset = this.direction();
            }
            this.offsetNextFrame = false;
        }
        if (!this.isMoving() && this.cameraOffset === Direction.NONE) {
            this.offsetNextFrame = true; //Let's wait to see if we're still not moving on the next frame
        } else if (this.isMoving()) {
            this.restoreCamera();
        }
    };

    //Moves to camera back to the player (if possible, and if it was actually moved)
    Game_Player.prototype.restoreCamera = function () {
        if (this.cameraOffset !== Direction.NONE && !$gameMap.isScrolling()) {
            if (this.cameraOffset !== this.direction() || !this.isMoving())
                $gameMap.startScroll(reverseDirection(this.cameraOffset), 1, speed || this.moveSpeed());
            this.cameraOffset = Direction.NONE;
            return true;
        }
        return false;
    }

    //Checks if it's possible for the map to scroll in a specific direction
    Game_Map.prototype.canScroll = function (direction) {
        switch (direction) {
            case Direction.DOWN: return this.isLoopVertical() || this.height() >= this.screenTileY() && this.displayY() < this.height() - this.screenTileY();
            case Direction.UP: return this.isLoopVertical() || this.height() >= this.screenTileY() && this.displayY() > 0;
            case Direction.LEFT: return this.isLoopHorizontal() || this.width() >= this.screenTileX() && this.displayX() > 0;
            case Direction.RIGHT: return this.isLoopHorizontal() || this.width() >= this.screenTileX() && this.displayX() < this.width() - this.screenTileX();
            default: return Direction.NONE;
        }
    };

    //Reverses the given direction, NONE is turned to NONE
    let reverseDirection = function (direction) {
        switch (direction) {
            case Direction.DOWN: return Direction.UP;
            case Direction.UP: return Direction.DOWN;
            case Direction.LEFT: return Direction.RIGHT;
            case Direction.RIGHT: return Direction.LEFT;
            default: return Direction.NONE;
        }
    };

})();