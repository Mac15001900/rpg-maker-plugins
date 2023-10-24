/*:
 * @author Mac15001900
 * @plugindesc Allows events to run other events in various ways.
 * 
 * @param With an invalid target
 * @desc What should the plugin do when trying to run a non-existent event or page?
 * @type select
 * @option Do nothing
 * @option Show a warning in console
 * @option Throw an error
 * @default Show a warning in console
 * 
 * @param Max chain length
 * @desc The maximum allowed length for a chain of events calling each other.
 * @type number
 * @default 1000
 * 
 * @param Events with trigger "none"
 * @desc Removes triggers from some events so that the player can't manually activate them at all, for use with this plugin.
 * @type select
 * @option Disabled
 * @option When notetag "<NoTrigger>" is present
 * @value Notetag
 * @option When "Through" is on, trigger is "action button" and priority is above or below characters
 * @value Through
 * @default Notetag
 * 
 * @help
 * This plugin provides a command "RunEvent [id|offset]", which allows you
 * to run another event, specified either by an offset from the current event or 
 * a target event id.
 * 
 * ------------------------------------------------------------------------------
 * Specifying by ID:
 * You can specify the target event by ID. It's useful for one-off situations, 
 * when the target event is far away or doesn't have a predictable position. 
 * 
 * Example:
 * RunEvent 42
 * 
 * ------------------------------------------------------------------------------
 * Specifying by offset:
 * You can specify the relation in space of the target event relative to the 
 * current event.
 * This is useful for creating reusable events that always run an event 
 * next to them and can be copy-pasted anywhere.
 * For example: "up" will run the event directly above the current event.
 * 
 * The allowed words are:
 * up, down, left, right - specify a direction
 * north, south, east, west - alternatives to the above
 * facing - the direction the player is current facing
 * this - runs the same event that used the command
 * 
 * All of those can be freeely combined using dashes '-'
 *
 * Examples:
 * RunEvent left
 * RunEvent left-left-up
 * RunEvent this
 * RunEvent left-north-up-right-facing-down-south 
 * (Ok, I'm not sure why you'd use that last one, but you can)
 * 
 * Note: this uses the current positions of both events, which might be different
 * than in the editor if they move.
 * 
 * ------------------------------------------------------------------------------
 * Additionally, you can specify the page of the event you'd like to run, e.g.
 * "RunEvent left 3" will run the 3rd page of the event on the left, ignoring
 * any conditions that page has. This can also be specified with a variable, e.g.
 * "RunEvent left v42".
 * If you don't specify a page the currently active one will be used.
 * 
 * ------------------------------------------------------------------------------ 
 * The same functionality is also provided with a script call:
 * MAC_RunNearbyEvent.run(eventId|offset string, interpreter, [pageId])
 * 
 * Examples: 
 * MAC_RunNearbyEvent.run(42, this)
 * MAC_RunNearbyEvent.run("left-left-up", this, 3)
 * 
 * ------------------------------------------------------------------------------
 * This plugin is available under the MIT Licence. You're free to use it in any 
 * games, commercial or not, or use the code in your own plugins. Credit is 
 * appreciated but not required.
 * 
*/


var Imported = Imported || {}
Imported.MAC_RunNearbyEvent = "1.0";
window.MAC_RunNearbyEvent = {}; //Global object for accesibility by scripts/other plugins

(function ($) {
    var params = PluginManager.parameters('MAC_RunNearbyEvent');

    var _Game_Interpreter_pluginCommand = Game_Interpreter.prototype.pluginCommand;
    Game_Interpreter.prototype.pluginCommand = function (command, args) {
        _Game_Interpreter_pluginCommand.call(this, command, args);
        if (['runevent', 'runnearbyevent', 'run_event', 'run_nearby_event'].includes(command.toLowerCase())) {
            $.run(args[0], this, args[1]);
        }
    };
    /**
     * 
     * @returns The current main (i.e. non-parallel) interpreter
     */
    $.getInterpreter = function () {
        let res = $gameMap._interpreter;
        while (res._childInterpreter && res._childInterpreter.isRunning()) res = res._childInterpreter;
        return res;
    }
    /**
     * Runs a target event, specified either by an offset from current event or a target event id.
     * @param {String|Number} arg Direction instructions, composed of dash-separated words, e.g. "left-left-up". Alternative, the ID of the target event.
     * @param {Game_Interpreter} [inp] Interpreter to use. If not specified, the plugin will use the map's main interpreter.
     * @param {Number} [page] The page of the target event to run. Uses indexes as shown in the editor, i.e. starting at 1. Will run the currently active page if not specified.
     */
    $.run = function (arg, inp, pageId) {
        inp ??= $.getInterpreter(); //If not specified we'll just grab the main intepreter
        if (inp.chainLength > Number(params["Max chain length"])) throw new Error("MAC_RunNearbyEvent: looks like you've made an infinite loop (or a chain that's longer than allowed maximum).");
        let event = null;
        let error = null;
        let page = null;
        if (!isNaN(arg) || arg[0] === 'v') { //We got an event id
            if (arg[0] === 'v') arg = $gameVariables.value(Number(arg.substring(1)));
            event = $gameMap._events[Number(arg)];
            if (!event) error = `MAC_RunNearbyEvent: no event with id ${arg}`;
        } else { //We got a direction
            let { x, y } = $gameMap._events[inp.eventId()];
            arg = arg.replace(/facing/g, ['down', 'left', 'right', 'up'][$gamePlayer.direction() / 2 - 1]);
            for (let part of arg.split('-')) {
                switch (part) {
                    case 'up':
                    case 'north':
                        y--;
                        break;
                    case 'down':
                    case 'south':
                        y++;
                        break;
                    case 'left':
                    case 'west':
                        x--;
                        break;
                    case 'right':
                    case 'east':
                        x++;
                        break;
                    case 'this':
                        break;
                    default:
                        throw new Error(`MAC_RunNearbyEvent: Invalid direction: ${part}`);
                }
            }
            event = $gameMap._events[$gameMap.eventIdXy(x, y)];
            if (!event) error = `MAC_RunNearbyEvent: no event at x:${x}, y:${y}`;
        }

        if (pageId !== undefined && event) {
            if (pageId[0] === 'v') pageId = $gameVariables.value(Number(pageId.substring(1)));
            page = event.event().pages[Number(pageId) - 1];
            if (!page) error = `MAC_RunNearbyEvent: tried to run page ${pageId} on event ${event.eventId()}. This page doesn't exist.`;
        }

        if (!error) {
            event.refresh(); //Refresh the event in case some conditions were changed on this frame
            let commandList = page ? page.list : event.list();
            inp.setupChild(commandList, event.eventId()); //The meat of this function - starting the event
            inp._childInterpreter._depth -= 1; //We don't want to increase the depth here, so we undo the default +1
            inp._childInterpreter.chainLength = (inp.chainLength ?? 0) + 1;
        } else {
            switch (params['With an invalid target']) {
                case "Do nothing":
                    break;
                case "Show a warning in console":
                    console.warn(error);
                    break;
                case "Throw an error":
                    throw new Error(error);
                    break;
            }
        }
    }

    switch (params['Events with trigger "none"']) {
        case "Disabled": break;
        case "Through":
            Game_Player.prototype.startMapEvent = function (x, y, triggers, normal) {
                if (!$gameMap.isEventRunning()) {
                    $gameMap.eventsXy(x, y).forEach(function (event) {
                        if (event.isTriggerIn(triggers) && event.isNormalPriority() === normal && (normal || !event.isThrough())) {
                            event.start();
                        }
                    });
                }
            };
            break;
        case "Notetag":
            Game_Player.prototype.startMapEvent = function (x, y, triggers, normal) {
                if (!$gameMap.isEventRunning()) {
                    $gameMap.eventsXy(x, y).forEach(function (event) {
                        if (event.isTriggerIn(triggers) && event.isNormalPriority() === normal && (!event.event().meta["NoTrigger"])) {
                            event.start();
                        }
                    });
                }
            };
            break;
    }

})(window.MAC_RunNearbyEvent);


