define(["text!tplBasePath/baseTemplate.html", 
	    "text!tplBasePath/questionTemplate.html",
	    "text!tplBasePath/endScreenTemplate.html",
	    "text!tplBasePath/endScreenContentTemplate.html",
      "text!tplBasePath/updateTeamScoreTemplate.html",
      "text!tplBasePath/initTemplate.html"
	    ], function(baseTpl, engLangTpl, endScreenTpl, endScreenContentTpl, updateTeamScoreTpl, initTpl) {

  var app = function (baseTpl, engLangTpl, endScreenTpl, endScreenContentTpl, updateTeamScoreTpl, initTpl) {
    var _data = null,
		_curQuesIdx = 0,
		_corAnsIdx = null,
		_corTeamId = null,
		_qtnInfo = null,
		_isFinalQuestion = false;
    _flipClock = null;
    _fClockCurTime = null;
	
    var _initialize = function () {
      var initTemplate = _.template(initTpl)();
      $("body").append(initTemplate);
      $("#quizRules").modal({
        show: true,
        backdrop: "static",
        keyboard: false
      });
	  
  	  _loadData();
  	  _.delay(function () {
  	    _onNextClicked();
  	  }, 100);
    };
	
	var _loadData = function () {
    $.ajax({
	    type: "GET",
		  url: "assets/data/data.json",
		  dataType: "json"
	  })
	  .done(function (data, textStatus, jqXHR) {
		  _data = data;
	    console.log(_data);
		  _setLclData();

	    var qtnTemplate = _.template("<li class='numbers'><button type='button' class='btn btn-default' data-toggle='modal' data-target='#updateScore'><span class='glyphicon glyphicon-edit'></span></button></li> <li class='numbers'>Questions: <span class='num-cur'><%=obj.current%></span> <span class='num-total'>/ <%=obj.total%></span></li>");
	    var baseTemplate = _.template(baseTpl);
	    var compiledBaseTpl = baseTemplate({obj: _data});
      var updateScoreTpl = _.template(updateTeamScoreTpl)();

	    _qtnInfo = {
	      current: 1,
	      total: _data.data.length
	    };
	    var compiledQtnTpl = qtnTemplate({obj: _qtnInfo});

        $("body")
          .append(compiledBaseTpl)
          .find(".nav.masthead-nav").append(compiledQtnTpl)
          .end()
          .append(updateScoreTpl)
          .append(endScreenTpl);

      $("#save-score").off("click").on("click", _saveUpdatedScore);
	  })
	  .fail(function (jqXHR, textStatus, errorThrown) {
	    console.error("Error in loading data.json " + textStatus);
	  });
	
	};
	
	var _renderQuestion = function () {
	  var compileTpl = _.template(engLangTpl);
	  var curTemp = compileTpl({obj: _data.data[_curQuesIdx]});
	  _corAnsIdx = _data.data[_curQuesIdx].cor_ans_idx;
	  _corTeamId = _data.data[_curQuesIdx].team_id;

	  $(".team .thumbnail").removeClass("thumbnail-active thumbnail-success thumbnail-error");
	  $("#" + _corTeamId + "> .thumbnail").addClass("thumbnail-active");

	  $("#next").button("reset").off();
	  $(".jumbotron.quiz-content").empty().append(curTemp);

    $("#submit, .options-wrap > .options > .thumbnail").off("click").on("click", _onSubmitClick);
	  $(".options-wrap > .options > .thumbnail").addClass("invisible");
	  
    $("#next").off("click").on("click", _onNextClicked);
	  $("#enableAnswers").off("click").on("click", _onClickBtnEnableAnswers);
	  
      _.delay(function () {
        $("#next").addClass("disabled").prop("disabled", true);
      }, 50);

      if ((_qtnInfo.current + 1) === _qtnInfo.total) {
      	$("#next").hide();
      	_isFinalQuestion = true;
      }

	  _showNextNum();
	};
	
	var _computeResult = function ($target) {
	  var corAnsIdx = _corAnsIdx;

      if ($target) {
        var $target = $target.parent(),
        score = null;

        if (_corAnsIdx == $target.attr("data-idx")) {
          score = parseInt($("#" + _corTeamId + " .score").text(), 10) + 20;
          $("#" + _corTeamId + " .score").text(score);
          $("#" + _corTeamId + " > .thumbnail").addClass("thumbnail-success");

          _updateLclData(score, _corTeamId);
        } else {
          $("#" + _corTeamId + " > .thumbnail").addClass("thumbnail-error");
        }
      }

	  $("#submit").button("loading");
	  $(".options-wrap > .options > .thumbnail").removeClass("thumbnail-error").addClass("thumbnail-error").addClass("disabled");
	  $("[data-idx=" + corAnsIdx + "] > .thumbnail").removeClass("thumbnail-error disabled").addClass("thumbnail-success");
	  $("#submit").button("reset");
	  _.delay(function () {
	    $("#submit").addClass("disabled").prop("disabled", true).text("Done");
	  }, 100);

      $("#next").removeClass("disabled").prop("disabled", false);

      if (_isFinalQuestion) {
      	_computeQuizResult();
      }
	};

    var _onSubmitClick = function (e) {
    	var $target = $(e.target);

      // Stop running flipClock
      _stopFClock(true);

    	if ($target.parent().parent().hasClass("disabled") || $target.parent().hasClass("disabled") || $target.parent().hasClass("thumbnail-success") || $target.parent().parent().hasClass("thumbnail-success")) {
    	  return false;
    	}

       if ($target.hasClass("disabled") || $target.hasClass("thumbnail-success")) {
         console.log("target has disabled class, so function will be disabled!");
         e.preventDefault();
         e.stopPropagation();
         return false;
       }

       if ($target.hasClass("thumbnail")) {
         $target = $target;
       } else if ($target.parent().hasClass("thumbnail")) {
         $target = $target.parent();
       } else if ($target.parent().parent().hasClass("thumbnail")) {
         $target = $target.parent().parent();
       } else {
       	 $target = null;
       }

      _curQuesIdx = (parseInt(_curQuesIdx, 10) + 1);
      _qtnInfo.current = _curQuesIdx;
	  _computeResult($target);
    };

    var _showNextNum = function () {
    	var $target = $(".numbers", ".masthead");

    	$target
    	  .find(".num-cur").empty().text((_curQuesIdx + 1))
    	  .end();
    };

    var _onNextClicked = function (e) {
      $("#next").button("loading");
	  _.delay(function () {
          _renderQuestion();
	  }, 1000);
    };

    var _computeQuizResult = function () {
    	var endScnTpl = _.template(endScreenContentTpl);
    	var compiledTpl = "";
    	var teamData = JSON.parse(localStorage.getItem("teams"));
    	var allScores = _.pluck(teamData, 'score');
    	var maxScore = parseInt(_.max(teamData, function (team) {return team.score}).score, 10);
    	var winTeams = _.where(teamData, {score: maxScore});
    	var finalObj = {};

    	finalObj = {
    		winners: winTeams,
    		teams: teamData
    	};
    	compiledTpl = endScnTpl({obj: finalObj});
    	$("#accordion").append(compiledTpl);

    	$("#myModal").modal({
    		keyboard: false,
    		backdrop: 'static',
    		show: true
    	});
    };

    var _setLclData = function () {
    	localStorage.setItem("teams", JSON.stringify(_data.teams));
    };

    var _updateLclData = function (score, teamId) {
    	var teams = JSON.parse(localStorage.getItem("teams"));
    	var selTeamObj = _.findWhere(teams, {id: teamId});
    	var selTeamIdx = _.indexOf(teams, selTeamObj);

    	teams[selTeamIdx].score = score;
    	localStorage.setItem("teams", JSON.stringify(teams));
    };

    var _saveUpdatedScore = function (e) {
      var $target = $(e.target);
      var teamName = $("#team-name").val().trim().toLowerCase();
      var teamScore = $("#team-score").val().trim().toLowerCase();

      teamScore = parseInt(teamScore, 10);
      _updateLclData(teamScore, teamName);
      $("#" + teamName + " .score").text(teamScore);
      $("#updateScore").modal("hide");
    };
	
	var _onClickBtnEnableAnswers = function (e) {
	  var $target = $(e.target);
	  
	  $(".options-wrap > .options > .thumbnail").removeClass("invisible");
    _initFlipClock();
	};

  var _initFlipClock = function () {
    $(".clock").removeClass("invisible");
    
    _flipClock = new FlipClock($('.clock'), 15, {
      clockFace: 'Counter',
      autoStart: true,
      countdown: true,
      callbacks: {
        stop: function (isInvokedExternally) {
          console.log("flipClock has stopped");
          //_fClockCurTime = (_flipClock.original - _flipClock.timer.count);

          if (!isInvokedExternally) {
            $("#submit").trigger("click");
          }
        }
      }
    });
  };

  var _startFClock = function () {
    _flipClock.start();
  };

  var _stopFClock = function (isInvokedExternally) {
    //_flipClock.stop(isInvokedExternally);
    _flipClock.reset();
    _flipClock.$el.addClass("invisible");
    //_flipClock.setTime(_fClockCurTime);
  };

	  _initialize();
  };
  
  return new app(baseTpl, engLangTpl, endScreenTpl, endScreenContentTpl, updateTeamScoreTpl, initTpl);
});