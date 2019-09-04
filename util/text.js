exports.retard = function(text) {
    let ignoreChars = [' ', '.', ';', ':', '(', ')', '!', '[', ']', '{', '}', '"', '\'', '-', '+'];
    let capitalize = true;
    let newText = "";

    for(let i=0; i<text.length; i++) {
        // Check escape sequence
        if(text[i] === '"') {
            i++;
            while(text[i] !== '"') {
                newText += text[i]
                i++;
            }
            i++;
        }

        if(ignoreChars.indexOf(text[i]) > -1) { // Skip
            newText+=text[i];
            continue;
        }


        // Replace
        newText+=(capitalize?text[i].toUpperCase():text[i].toLowerCase());
        capitalize=!capitalize;
    }
    return newText;
}