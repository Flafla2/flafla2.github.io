$(document).ready(function() {
	mobileNavDisplayed = false;
	$(".nav#mobile").click(function() {
		if(!mobileNavDisplayed) {
			$("#navlinks").slideDown();
			$(".nav#mobile").html("close navigation");
		} else {
			$("#navlinks").slideUp();
			$(".nav#mobile").html("open navigation");
		}
		mobileNavDisplayed = !mobileNavDisplayed;
	});

	$(".navlink").mouseover(function() {
		$(".nav").redraw();
	});
});

$( window ).resize(function() {
	if($(".nav#mobile").css("display") === "none") {
		$("#navlinks").css("display","none");
		$("#navlinks").stop();
		mobileNavDisplayed = false;
		$(".nav#mobile").html("open navigation");
	}
});

$.fn.redraw = function(){
  this.offsetHeight;
  $(this).css("-webkit-transform","rotateZ(0)");
  $(this).css("-webkit-transform","none");
};