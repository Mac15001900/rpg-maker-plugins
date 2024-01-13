/*:
 * @plugindesc v1.0 Extracts all text from a game into a single file
 * @author Mac15001900
 * 
 * @help 
 * This plugin extracts all text from a game into a single file, for 
 * spellchecking or any other purpose.
 * 
 * To use it, open the console (press F12 and select the "Console" tab),
 * then type: runExtractor()
 * 
 * Note that this will freeze your game - after the process is done, you'll
 * need to refresh it if you want to do some playtesting.
 * The file will be created in your project's main folder.
 * 
 * The extracted text contains the contents of every message command and
 * every choice command from every regular and common event in the game.
 * There is some processing to remove text codes (so "\c[4]Hi" becomes "Hi"),
 * but it might not handle every code that plugins can add.
 * 
 * You can optionally add a <NoExtraction> notetag to a map or event in order to
 * prevent its text from being extracted. This is useful for test maps or events
 * where you don't need to spellcheck the text.
 * 
 * This plugin is available under the MIT Licence. You're free to use it in any 
 * games, commercial or not, or use the code in your own plugins. Credit is 
 * appreciated if you find it useful, but not required. 
 */


void function () {

    let extractedString = "";

    //Converts a list of commands to a printable string
    function showList(page) {
        let res = "";
        let commandList = page.list;
        for (id in commandList) {
            if (commandList[id].code === 101) res += "\n";
            if (commandList[id].code === 401) res += commandList[id].parameters[0] + "\n";
            if (commandList[id].code === 102) res += "\nChoice:\n" + commandList[id].parameters[0].map(s => "  -" + s).join('\n') + "\n";
        }
        return res.substring(1);
    }

    //Converts a regular event to a printable string
    function showEvent(event) {
        if (!event || event.meta["NoExtraction"]) return "";
        let pageStrings = event.pages.map(showList).filter(s => s.length > 0);
        if (pageStrings.length === 0) return "";
        return "--- Event " + event.name + " (" + event.id + ") ---\n\n" + pageStrings.join("\n-----\n\n");
    }

    //Converts a common event to a printable string
    function showCommonEvent(id) {
        let event = $dataCommonEvents[id];
        if (!event) return "";
        let text = showList(event);
        if (text.length === 0) return "";
        return "--- Common Event " + event.name + " (" + id + ") ---\n\n" + text;
    }

    //Converts a map to a printable string
    function showMap(mapData) {
        if (mapData.meta["NoExtraction"]) return "";
        let res = "";
        for (let id = 0; id < mapData.events.length; id++) {
            let eventString = showEvent(mapData.events[id]);
            if (eventString.length > 0) res += eventString + "\n";
        }
        return res;
    }

    //Loads a map if it exists
    function tryLoadingMap(mapId) {
        if ($dataMapInfos[mapId]) DataManager.loadMapData(mapId);
    }

    //Saves the text to a file
    function saveExtractedText(text) {
        var fs = require('fs');
        var path = require('path');
        var dirPath = path.dirname(process.mainModule.filename);
        var filePath = path.join(dirPath, "extractedText.txt");
        if (!fs.existsSync(dirPath)) {
            fs.mkdirSync(dirPath);
        }
        fs.writeFileSync(filePath, text);
        console.log("-----------------------------------");
        console.log("All done! Text saved to " + filePath);
    };

    //Removes or converts some special escape characters, for saving strings as plain text. Probably won't handle everything though.
    function simpleUnescape(string) {
        return Window_Base.prototype.convertEscapeCharacters(string)
            .replace(/\x1bMSGCORE\[(\d+)\]/g, '') //Replaces most Yanfly MessageCore codes
            .replace(/\x1bfn<(\w+)>/g, '') //Replaces \fn<Fontname>
            .replace(/\x1b((Shake|Slide|Wave)(<.*?>)?|Circle|ResetShake)/g, '') //Replaces codes from SRD_ShakingText
            .replace(/\x1b\w\[(\d+)\]/g, '') //Replaces all single-character \x[n] codes
            .replace(/\x1b\S/g, ''); //Replaces all single-character \x codes
    }

    //Runs the entire extraction process
    function runExtractor(currentId) {
        //First call of this function. Let's set some things up
        if (currentId == null) {
            console.log("Starting extraction. This might take a moment...");
            SceneManager.stop();
            if ($dataMapInfos[0]) DataManager.loadMapData(0);
            extractedString = "";
            //Show common events
            for (let id = 1; id < $dataCommonEvents.length; id++) {
                let commonEventString = showCommonEvent(id);
                if (commonEventString.length > 0) extractedString += commonEventString + "\n";
            }
            //This delay is not actually necessary, but letting the current frame finish processing stops a bunch of ugly errors from appearing
            setTimeout(runExtractor, 50, 0);
            return;
        }

        //We've iterated over all ids. Return the string
        if (currentId >= $dataMapInfos.length) {
            let escapedText = simpleUnescape(extractedString);
            let finalText = "Text extracted from " + $dataSystem.gameTitle + " on " + (new Date()).toLocaleString() + "\n\n\n" + escapedText;
            saveExtractedText(finalText);
            console.log("Note that the game will not be able to run now - refresh it if you want to keep playtesting.");
            return;
        }

        //There is no map with this id. Let's try the next one.    
        if (!$dataMapInfos[currentId]) {
            tryLoadingMap(currentId + 1);
            runExtractor(currentId + 1);
            return;
        }

        if (!DataManager.isMapLoaded()) setTimeout(runExtractor, 25, currentId); //Data is not loaded yet. Wait 25ms and try again.
        else { // Data is loaded, and it's the right map. Show the map and try the next one.
            let mapString = showMap($dataMap);
            if (mapString.length > 0) extractedString += "--------- Map " + $dataMapInfos[currentId].name + " (" + currentId + ") ---------\n\n" + mapString + "\n";
            console.log("Map " + $dataMapInfos[currentId].name + " extracted.");
            tryLoadingMap(currentId + 1);
            runExtractor(currentId + 1);
        }
    }

    window.runExtractor = runExtractor;

}();