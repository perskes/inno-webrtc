// cosmetically fixing the pipe, tackling the element generation later on

var nastyPipe = document.querySelectorAll("#supporters-card-container > div.innovaphone-root-visitenkarten > div.innovaphone-content > div.innovaphone-content__headline > strong")

for (x = 0; x < nastyPipe.length; x++) {
    nastyPipe[x].innerHTML = nastyPipe[x].innerHTML.replace(" | ", "<br>")
}
