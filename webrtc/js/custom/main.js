/*
var linkList = document.getElementsByTagName("link");
var targetLink;
[...linkList].forEach(function (link) {
    if (link.getAttribute("id") == "customTheme") {
        targetLink = link
    }
})

console.log(targetLink)
*/

function changeStyle(x) {
    var element = x.getAttribute("name")
    oldStylesheet = "customTheme"
    var newStyle;
    if (element == "default") {
        newStyle = "/js/innovaphone/innovaphone.widget.BusinessCards.css"
    } else {
        newStyle = "/css/" + element
    }
    document.getElementById(oldStylesheet).setAttribute("href", newStyle)
}


// register event listener for themes menu


var nodeList = Array.from(document.getElementById("topMenu").children);

for (var c of nodeList) {
    if (c.getAttribute("name") != null) {
        c.addEventListener("click", function () {
            changeStyle(this)
        })
    }
}
