// Below function adapted from jQuery Unveil to work with gfycat
// http://luis-almeida.github.com/unveil
// Copyright 2013 Luís Almeida
// Modified 2016 Adrian Biagioli
;(function($) {

  $.fn.unveil = function(threshold, callback) {

    var $w = $(window),
        th = threshold || 0,
        images = this,
        loaded;

    this.one("unveil", function() {
      var source = this.getAttribute("gfy-name");
      if (source) {
      	this.setAttribute("class", "gfyitem");
      	this.setAttribute("data-controls", "false");
      	this.setAttribute("data-expand", "true");
        this.setAttribute("data-id", source);
        var gfyObj = new gfyObject(this);
        gfyCollection.get().push(gfyObj);
        gfyObj.init();
        if (typeof callback === "function") callback.call(this);
      }
    });

    function unveil() {
      var inview = images.filter(function() {
        var $e = $(this);
        if ($e.is(":hidden")) return;

        var wt = $w.scrollTop(),
            wb = wt + $w.height(),
            et = $e.offset().top,
            eb = et + $e.height();

        return eb >= wt - th && et <= wb + th;
      });

      loaded = inview.trigger("unveil");
      images = images.not(loaded);
    }

    $w.on("scroll.unveil resize.unveil lookup.unveil", unveil);

    unveil();

    return this;

  };

})(window.jQuery || window.Zepto);

$(document).ready(function() {
	$(".gfyunveil").unveil();

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