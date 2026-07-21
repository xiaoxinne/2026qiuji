//数据上报
const ReportHelper = (function () {
    function getQueryParams() {
        const params = new URLSearchParams(window.location.search);
        const result = {};

        params.forEach((value, key) => {
            result[key] = decodeURIComponent(value);
        });

        return result;
    }

    let isGameEnd = false;

    const gameReportParams = {
        difficulty: 1,
        question_id: 'calculateShortTerm_kin2026_03_s_03',
        questionCount: 3,
        wrongTimes: [0, 0, 0],
        score: 0,
        maxScore: 3,
        is_correct: false,
    };

    function resetWrongTimes() {
        gameReportParams.wrongTimes = Array(gameReportParams.questionCount).fill(0);
    }

    function recordWrongTime(pageIndex) {
        if (pageIndex < 0 || pageIndex >= gameReportParams.wrongTimes.length) {
            return;
        }
        gameReportParams.wrongTimes[pageIndex] += 1;
    }

    function axxFinishInteraction(payload = {}) {
        if (isGameEnd) {
            return;
        }
        report('game_answer', {
            question_id: gameReportParams.question_id,
            is_correct: gameReportParams.is_correct,
            wrongTimes: gameReportParams.wrongTimes,
        });
    }

    function registerAxxFinishInteraction() {
        window.AxxNACallH5 = {
            axxFinishInteraction,
        };
        window.addEventListener('message', (event) => {
            const data = event.data || {};
            if (data.type !== 'axxFinishInteraction') {
                return;
            }
            window.AxxNACallH5?.axxFinishInteraction?.(data.payload || {});
        });
    }

    function report(event_type, event_params = {}) {
        const params = getQueryParams();
        const event_data = { ...event_params };
        if (event_type === 'game_start') {
            registerAxxFinishInteraction();
            event_data.difficulty = gameReportParams.difficulty;
        }
        if (event_type === 'game_answer') {
            event_data.question_id = gameReportParams.question_id;
            event_data.wrongTimes = gameReportParams.wrongTimes;
            event_data.is_correct = gameReportParams.is_correct;
        }
        if (event_type === 'game_end') {
            isGameEnd = true;
            event_data.score = gameReportParams.score;
            event_data.maxScore = gameReportParams.maxScore;
        }

        const data = {
            event_type: event_type,
            session_id: '',
            timestamp: Date.now(),
            version: '1.0.0',
            ...params,
            custom_params: event_data,
        };

        if (window.axxBridge && typeof window.axxBridge.reportLog === 'function') {
            const json = JSON.stringify(data);
            window.axxBridge.reportLog(json);
            console.log('[ReportHelper] send:', data);
        } else {
            console.warn('[ReportHelper] axxBridge.reportLog 不存在 -> 模拟打印', data);
        }
        if (event_type === 'game_answer') {
            report('game_end', {});
        }
    }
    return {
        report,
        getQueryParams,
        gameReportParams,
        resetWrongTimes,
        recordWrongTime,
    };
})();
