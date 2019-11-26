var fastn = require('fastn')(require('fastn/domComponents')());
var cpjax = require('cpjax');

var data = {};

function fixedMinutes(time){
    return (time / 1000 / 60).toFixed(2);
}

function renderParticipantResults(startTime){
    return fastn('div', { class: fastn.binding('item.result', result => [result, 'result']) },
        fastn('span',
            fastn.binding('item.result', result => result.toUpperCase())
        ),
        ' - ',
        fastn('span',
            fastn.binding(startTime, 'item.time', (start, time) => fixedMinutes(time - start)),
            ' minutes'
        )
    );
}

function renderParticipants(){
    var attemptsToShow = 3;
    return fastn('div', { class: 'participant' },
        fastn('h2', fastn.binding('item.name')),
        fastn('p', fastn.binding('item.attempts|*', function(attempts){
            var notShownCount = attempts.length - 3;
            return (notShownCount > 0 ? notShownCount + ' attempt' + (notShownCount > 1 ? 's' : '') + ' not shown' : '');
        })),
        fastn('section:list', {
            items: fastn.binding('item.attempts|*', attempts => attempts.slice(-3)),
            template: (model, scope) =>
                renderParticipantResults(fastn.binding('item.time').attach(scope)),
            emptyTemplate: () => fastn('h3', 'No results yet')
        })
    );
}

function renderChallengeResults(){
    return fastn('div', { class: 'challenge' },
        fastn('h2', fastn.binding('key')),
        fastn('section:list', {
            class: 'participants',
            items: fastn.binding('item|*'),
            template: renderParticipants
        }),
        fastn('h2', 'Average time-to-pass'),
        fastn.binding('item|**', function(challengeResults){
            var participantKeys = Object.keys(challengeResults);
            var passInfos = participantKeys
                .map(key => challengeResults[key])
                .reduce(function(results, participantData){
                    var firstPass = participantData.attempts
                        .slice()
                        .filter(result => result.result === 'pass')
                        .sort((a, b) => b.time - a.time)
                        .pop();

                    return results.concat(firstPass ? firstPass.time - participantData.start : []);
                }, []);

            if(!passInfos.length){
                return 'No passes yet';
            }

            var averageTime = passInfos
                .reduce(function(result, time){
                    return result += time;
                }, 0) / passInfos.length;

            return fixedMinutes(averageTime).toString() + ' minutes';
        })
    );
}

var ui = fastn('section',
        fastn('h1', 'Results'),
        fastn('list', {
            class: 'challenges',
            items: fastn.binding('results|*'),
            template: renderChallengeResults,
            emptyTemplate: () => fastn('h3', 'No challenges started yet')
        })
    );

ui.attach(data);

window.addEventListener('load', function(){
    document.body.appendChild(ui.render().element);
});

function getResults(){
    cpjax({ url: '/results', dataType: 'json'}, function(error, attempts){
        if(error){
            return;
        }

        var challenges = attempts.reduce(function(results, attempt){
            results[attempt.challenge] = results[attempt.challenge] || {}
            results[attempt.challenge][attempt.sessionId] = results[attempt.challenge][attempt.sessionId] || {
                ...attempt,
                attempts: []
            };
            results[attempt.challenge][attempt.sessionId].attempts.push(attempt)
            return results;
        }, {})

        fastn.Model.set(data, 'results', challenges);

        setTimeout(getResults, 3000);
    });
}

getResults();