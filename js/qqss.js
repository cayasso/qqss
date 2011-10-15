
(function($, undefined){

	$.storage = new $.store();
	
	var _ = {
		points: 0,
		cache : {},
		cached : false,
		history : "",		
		defaults : {			
			levels : 2,
			load_cache : false,
			start_level : 1,			
			num_questions : 5,			
			files: {			
				prefix : 'level',
				path : '/qqss/beta/questions/'				
			}
		},
		
		track: function () {
		    soundManager.play('question', {
		        volume: 35,
		        onfinish: function () {
		            soundManager.play('question2', {
		                volume: 40,
		                onfinish: _.track
		            })
		        }
		    });
		},
		
		o : {}, 
		
		game : {
			
			init : function(options){
			
				if (_.game.status === false) {					
		
					console.log('QQSS - Initializing game...');
			
					// Set game status to true
					_.game.status = true;
						
					// Set the game options
					_.game.setOptions(options);
			
					// Set the game level
					_.level.set();
			
					// Get and set game questions
					_.questions.get();
	
					// Exit the game on browser exit
					window.onbeforeunload = QQSS.game.exit;											
				}
			},
			
			exit : function(){
				$.storage.set( 'qqss', _.game.getCache() );
				console.log('Game is over');
			},
			
			// Set the game options
			setOptions : function(options){								
				_.o = $.extend({}, _.defaults, options);
				console.log('QQSS - Setting options...');
			},
			
			duration : function(){},
			
			reset : function(){ _.cache = {}; _.game.status = false; $.storage.del( 'qqss'); _.history = ""; $.storage.del( 'qqss.log'); },
			
			getCache : function(){
				var cache = $.storage.get('qqss') || {};
				cache[_.o.files.prefix + _.cache.level] = _.cache;								
				return cache;
			},
			
			status : false
			
		},
		
		level : {
					
			// Set the game level
			set : function(l){			
								
				_.cache.level = l || _.o.start_level;
				
				console.log('QQSS - Setting game level to '+ _.cache.level +'...');
			},
			
			// Set the next level
			next : function(){
				
				_.cache.level++;
				
				console.log('Jumping to level ' + _.cache.level);
				
				if ( _.cache.level > _.o.levels ) {
					_.cache.level--;
					console.log('You have reached the maximun levels');
				} else {
					_.questions.get();
				}
			}
		},
		
		player : {
			set : function(){},			
			next : function(){},
			score : function(){}
		},
				
		questions : {
		
			// Get the questions based on level
			get : function(){
							
				// Get stored data
				var	data = $.storage.get( 'qqss' ), isCached = false;
				
				if ( data ) {					 
					 
					data = data[ _.o.files.prefix + _.cache.level ];

					isCached = (data && $.isPlainObject(data) && data.level == _.cache.level && data.questions) ? true : false;					
				}							
							
				// Check storage				
				if ( isCached ) {					
					
					console.log('QQSS - Questions loaded from cache...');
					
					$.publish('/qqss/questions', [ data ] );							
					
				} else {			
							
					// Set the remote file path
					var file = _.o.files.path + _.o.files.prefix + _.cache.level + '.js';					
					
					console.log('QQSS - Getting questions from remote file...');
					
					// Get the file via ajax
					$.getJSON(file, function(data){
						console.log('QQSS - Remote file loaded...');
						$.publish('/qqss/questions', [ data ]);						
					});		
				}								
			},
			
			// Set the current question
			set : function(index) {
			
				// If game is initialized continue
				if (_.game.status) {
								
					// If cached questions are not empty process question
					if ( _.cache.questions.length ) {
						
						index = index || 0;						
						
						// Get the question based on index
						var question = _.cache.questions[index]; 

						if (question && question.status != false) {
						
							// Set the current question index
							_.cache.current_question = index;
							
							// Keep the question from showing again by setting to false
							question.status = false;
							
							// Set individual question
							_.cache.questions[index] = question;
							
							console.log('QQSS - Current question index is: '+ index);
							
							// write the questions to the page
							_.questions.write(question);				
							
							// Store cache in browser storage
							$.storage.set( 'qqss', _.game.getCache() );
							console.log('QQSS - Storing cache object to browser...');		
						}
					} else {
						console.log('No more questions to show for level: '+ _.cache.level);
						
						//_.levels.next();
					}			
				}
			},
			
			remove : function() {},
			
			// Jump to the next question
			next : function() {
				
				if (_.cache.questions !== undefined) {
					
					var index = _.cache.current_question || 0;
											
					index++;
			
					if (typeof _.cache.questions[index] !== "undefined" && _.cache.questions[index].status === false)
						index++;			
				
					if (index < _.o.num_questions) {
				
						_.questions.set(index);
					
					} else {
						console.log('QQSS - Number of questions exeeded, should jump to next level');
						_.level.next();					
					}
				}
			},
			
			// Show a question based on index
			write : function(question) {	

				console.log('QQSS - Writing question...');

				console.log(' <br> Question index: [ ' + _.cache.current_question + ' ] Question Id: [ ' + question.id + ' ] Q: [ ' + question.question + ' ] A: [ ' + question.answers +' ] R: [ ' + question.answer + ' ]');
														
				$('#question').find('span').html(_.cache.current_question + ' - ' + question.question);				
				
				$('#answers').find('li').each(function(i){
					
					var $self = $(this);
					
					(i == question.correct) &&	$self.addClass('correct');
										
					$self.find('.answer-text').html(question.answers[i]);
				});
			},
			
			// Shuffle questions
			shuffle : function(ar){ 				
				var l = ar.length;						
				for (var n = 0; n < l - 1; n++) {
					var k = n + Math.floor(Math.random() * (l - n)), temp = ar[k];					
					ar[k] = ar[n];
					ar[n] = temp;			
				}
				return ar;
			}
		},
		
		answers : {
			process : function(question){
			
				var  answers = question.answers = _.answers.shuffle(question.answers);
				
				question.incorrect = [];

				for (var i = 0, l = answers.length; i < l; i++ ) {

					if ( question.answers[i] == question.answer || answers[i].search(/^\[.*\]$/) != -1 ) {
						question.answer = question.answers[i] = answers[i].replace(/(\[|\])/g, '');
						question.correct = i;		
					} else {
						question.incorrect.push(i);						
					}					
				}
				
				return question;
			},
			reveal : function(){},
			select : function(){},
			
			check : function(response){
				return (response == _.cache.questions[_.cache.current_question].correct)			
			},
			
			isCorrect : function(){},
			
			// Shuffle a group of answers
			shuffle : function(ar){
				for(var j, x, i = ar.length; i; j = parseInt(Math.random() * i), x = ar[--i], ar[i] = ar[j], ar[j] = x);
					return ar;
			}					
		},
		
		lifelines : {
		
			fifty : function(e){
			
				if (_.cache.current_question !== undefined) {
				
					var question = _.cache.questions[_.cache.current_question],
						r = _.answers.shuffle(question.incorrect);
				
					a = $('#answers li a').css('visibility', 'visible');
					                    
                    a.eq(r[0]).css('visibility', 'hidden');
                    a.eq(r[1]).css('visibility', 'hidden');
                    
					console.log('incorrect: ['+  r +'] 50:50 => '+ r[0] + r[1] + 'correct: ' + question.correct);					
					$(e).addClass('used').unbind('click');
				}
			},
			ask : function(e){
				 _.dialog('#dialog_comd_publico');
                $(e).addClass('used').unbind('click');
			},
			bible : function(e){
			
				var question = _.cache.questions[_.cache.current_question]
				
				 _.dialog('#dialog_comd_biblia', function () {
                    soundManager.play('bible');
                    setTimeout(function () {
                        $('#hint').html(question.hint);
                        $('#timer').countDown({
                            startNumber: 30,
                            callBack: function (me) {
                            
                                $('.window').fadeOut(1000, function () {
                                    $('#mask').fadeOut(1000);
                                });
                            }
                        })
                    }, 12000);
                });
                $(e).addClass('used').unbind('click');
			}
		},

		// Add a string to history log
		log : function(string) {
			_.history += '<p>Level: [ ' + _.cache.level + ' ] Time: [ '+ new Date + ' ] ' + string + '</p><hr>';		
			$('.game-history').html(_.history);			
			$.storage.get( 'qqss.log', _.history );
		},
		
		dialog: function (id, f) {
		    var maskHeight = $(document).height(),
		    	maskWidth = $(window).width(),
		    	winH = $(window).height(),
		    	winW = $(window).width();
		    	
		    $('#mask').css({ 'width': maskWidth, 'height': maskHeight })
		    .fadeIn(1000).fadeTo("slow", 0.8);
		    
		    $(id).css({
		        top: winH / 2 - $(id).height() / 2,
		        left: winW / 2 - $(id).width() / 2
		    });
		    
		    $(id).fadeIn(2000, function () {
		        if (f) f();
		    });
		}
	}
	
	$.subscribe('/qqss/questions', function(data){
		
		// Set questions variable
		var questions = data.questions;
		
		// Set the level
		data.level && _.level.set(data.level);
					
		// Set the questions and answers
		if (questions && questions.length) {

			_.cache.questions = [];
			_.cache.inactiveQuestions = [];
			// Iterate over each question to check status
			$.each(_.questions.shuffle(questions), function(i, q) {
			
				// If question status is false dont include in the array
				if (q.status !== false) {					
					
					_.cache.questions.push(_.answers.process(q));
										
					// Set question status to true
					q.status = true;
				} else {
					_.cache.inactiveQuestions.push(q);
				}
			});
			
			console.log('QQSS - Adding questions to cache...');
			
			_.questions.set();				
			
		} else {
			// Set game status to false because no more questions to show
			_.game.status = false;
			
			console.log('QQSS - No more questions to show for level: '+ _.cache.level);
		}
	});
			
	window.QQSS = _;
	
	$(document).ready(function(){
		QQSS.game.init();
		
		//$.publish('/qqss/game');
	});
	
})(jQuery);

(function($) {
	$.fn.countDown = function (settings, to) {
		settings = jQuery.extend({
		    startFontSize: '100px',
		    endFontSize: '100px',
		    duration: 1000,
		    startNumber: 10,
		    endNumber: 0,
		    callBack: function () {}
		},  settings);
		
		return this.each(function () {
		    if (!to && to != settings.endNumber) to = settings.startNumber;
		    $(this).text(to).css('fontSize', settings.startFontSize);
		    $(this).animate({
		        'fontSize': settings.endFontSize
		    },
		    settings.duration, '', function () {
		        if (to >= settings.endNumber + 1) $(this).css('fontSize', settings.startFontSize).text(to - 1).countDown(settings, to - 1);
		        else settings.callBack(this);
		    });
		});
	};
})(jQuery);

$('#answers').find('a').click(function () {
    soundManager.play('final');
    if ($('#answers').find('.selected').length) return false;
    
    $(this).parent().addClass('selected');
    $('#action').fadeIn().find('a:first').text('Revelar respuesta');
    return false;
});

        
$('#comd_biblia a').click(function(){
	return QQSS.lifelines.bible(this);
});

$('#comd_publico a').click(function(){
	return QQSS.lifelines.ask(this);
});

$('#comd_cincuenta a').click(function(){
	return QQSS.lifelines.fifty(this);
});

$('#action-link').click(function(){

	var $self = $(this),	
		action = $self.attr("data-action");
		
	if (action === 'reveal') {
							
		var $answer = $('#answers'),
			$li = $answer.find('li'),    
			index = $li.index($('li.selected'));
	    
	    // This line shouldnt be here but for the moment I will leave it    
	   	if (! QQSS.cache.questions[QQSS.cache.current_question])
	   	return false;
	   	
	   	var is_correct = QQSS.answers.check(index);
	   	
	   	soundManager.play((is_correct) ? 'win' : 'lose');				
	   	
		if (is_correct){
			
			/*soundManager.stopAll();
            soundManager.play('winner');
              */      
			var position = $('li.correct').position();
								
			$('li.correct').clone().css({
					background: 'transparent',
					left: position.left,					
					top: position.top,
					position: 'absolute'
				}).addClass('effect-wrapper').insertAfter('li.correct');
				
			var $ques = $('li.correct:not(.effect-wrapper) a').hide();
			
			
			//$('li.correct').wrap(wrapper);

			$('.effect-wrapper').fadeIn(100).animate({top:"-=20px"},100).animate({top:"+=20px"},100).animate({top:"-=20px"},100)
			.animate({top:"+=20px"},100).animate({top:"-=20px"},100).animate({top:"+=20px"},100, function(){ $ques.show(); $(this).remove() });

            //_.answers.total = $('.check').length;
                
			$self.attr('data-action', 'next').
		
			parent().fadeOut(function(){						
				$self.text('Próxima pregunta');			
				$(this).fadeIn();
			});
		} else {
		
			QQSS.dialog('#dialog_loose');
			
			$self.parent().fadeOut();
		}
		
		$answer.find('li.correct').addClass('light');
		
	} else if (action === 'next') {
	
		$self.attr('data-action', 'reveal');
		
		$(".up").removeClass('up', 500).addClass('check').prev().addClass('up', 500);
            QQSS.points = $('.check').eq(0).html();
            
		$('#answers').find('li').removeClass('correct selected light');		
		$('#reveal').fadeIn('fast', function(){		
			$self.text('Revelar respuesta');
		});
		
		$self.parent().fadeOut();		
		QQSS.questions.next();		
	}
	
	return false;
});

$('#reset').click(function(){
	QQSS.game.reset();
	return false;
});

QQSS.dialog('#dialog_start', function () {

    $('.start-game').click(function () {	
        $('.window').fadeOut(function () {
            $('#mask').fadeOut('fast');
        });
        
        setTimeout(function () {soundManager.play('introplay', {
            onfinish: QQSS.track
        });}, 1500);
        
       	return false;
    });
});
