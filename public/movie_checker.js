let imgNum = 2;

function displayMovieImg() {
    var displayImg = $("#movie-img");
    var newSrc = "/images/img_" + imgNum + ".png";
    
    var tempImg = new Image();
    tempImg.onload = function() {
        displayImg.fadeOut(500, function() {
            displayImg.attr("src", newSrc).fadeIn(500);
        });
    };
    tempImg.src = newSrc;

    if(imgNum === 10){
        imgNum = 1;
    }else{
        imgNum++
    }
}

setInterval(displayMovieImg, 5000);