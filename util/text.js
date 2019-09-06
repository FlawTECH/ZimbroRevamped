exports.retard = function(text) {
    let ignoreChars = [' ', '.', ';', ':', '(', ')', '!', '[', ']', '{', '}', '"', '\'', '-', '+'];
    let capitalize = true;
    let newText = "";

    for(let i=0; i<text.length; i++) {
        // Check escape sequence
        if(text[i] === '"') {
            i++;
            while(text[i] !== '"' && i < text.length) {
                newText += text[i]
                i++;
            }
            if(i >= text.length) {
                i=text.length-1;
                continue;
            }
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