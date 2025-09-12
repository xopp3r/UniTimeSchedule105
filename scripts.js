
async function init() {
    const preferenses = loadPreferenses();

    if (preferenses != null) {
        document.schedule = await loadSchedule(preferenses.school, preferenses.group, preferenses.subgroup);
        if (document.schedule == undefined) alert("Failed to load schedule, refresh the page");
        
        reload();
    } else {
        choosePreferences();
    }

    setInterval(reload, 10000); // update every 10 secs to keep text accurate
    registerServiceWorker()
}

function reload(selectedWeekdayIndex = -1, selectedWeekIndex = -1) {
    if (document.app !== undefined) { // reload from existing app instance
        if (selectedWeekdayIndex == -1) selectedWeekdayIndex = document.app.selectedWeekdayIndex;
        if (selectedWeekIndex == -1) selectedWeekIndex = document.app.selectedWeekIndex;
    }

    document.app = new App(document.schedule, selectedWeekdayIndex, selectedWeekIndex);
    document.app.displayWeekdays();
    document.app.displaySchedule();
}

function loadPreferenses() {
    // loads settings from local storage
    const school = localStorage.getItem("school");
    const group = localStorage.getItem("group");
    const subgroup = localStorage.getItem("subgroup");
    
    return (school != undefined && group != undefined && subgroup != undefined) ? 
            {school: school, group: group, subgroup: subgroup} : null;
}

function registerServiceWorker(){
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', function() {
        navigator.serviceWorker.register('/sw.js')
            .then(function(registration) {
            console.log('ServiceWorker зарегистрирован: ', registration);
            
            // Проверяем обновления
            registration.addEventListener('updatefound', () => {
                console.log('Обнаружено обновление Service Worker');
            });
            })
            .catch(function(error) {
            console.log('Ошибка регистрации ServiceWorker: ', error);
            });
        });
    } else {
        console.log('Service Worker не поддерживается');
    }
}

function choosePreferences(){
    // todo
    localStorage.setItem("school", "msu");
    localStorage.setItem("group", "105");
    localStorage.setItem("subgroup", "1");
    init();
}

function fetchSchedule(name) {
    return fetch('./' + name + '.json')
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            return response.json();  
        }).catch(error => console.error('Failed to fetch data:', error)); 
}

function loadSchedule(school, group, subgroup) {
    const jsonName = school + '_' + group + '_' + subgroup;
    return fetchSchedule(jsonName);
}

function getWeekNumber(date = new Date()) {
    const startOfYear = new Date(date.getFullYear(), 0, 1);
    const startOfYearWeekIndex = (startOfYear.getDay() + 6) % 7;
    const diffInTime = date.getTime() - startOfYear.getTime();
    const diffInDays = Math.floor(diffInTime / (1000 * 60 * 60 * 24)) + startOfYearWeekIndex;
    
    return Math.floor(diffInDays / 7);
}

function getMinutes(str) {
    str = str.split(":");
    return Number(str[0]) * 60 + Number(str[1]);
}






class App {
    constructor(schedule, selectedWeekdayIndex = -1, selectedWeekIndex = -1) {
        const today = new Date();
        const todayWeekdayIndex = ((today.getDay() + 6) % 7);
        
        
        this.schedule = schedule;
        this.scheduleCycle = schedule.cycle;
        
        this.todayWeekdayIndex = todayWeekdayIndex;
        this.todayWeekIndex = (getWeekNumber(today)) % schedule.cycle;
        
        if (selectedWeekdayIndex == -1 || selectedWeekIndex == -1) { // if it is fresh start of application
            const nextLessonIndexes = this.getNextLessonIndexes();

            this.selectedWeekdayIndex = nextLessonIndexes.weekdayIndex;
            this.selectedWeekIndex = nextLessonIndexes.weekIndex;

        } else {
            this.selectedWeekdayIndex = selectedWeekdayIndex;
            this.selectedWeekIndex = selectedWeekIndex;
        }

    }

    // selects a next day that has upcoming lessons, skips empty and ended days
    getNextLessonIndexes(){

        for (let i = this.todayWeekdayIndex; i < 7 * this.scheduleCycle; i++){
            const weekdayIndex = i % 7;
            const weekIndex = (this.todayWeekIndex + Math.floor(i / 7)) % this.scheduleCycle;
            
            const selectedDaySchedule = this.schedule.schedule[weekIndex][
                ["mon","tue","wed","thu","fri","sat","sun"].at(weekdayIndex)
            ]
            
            const ttext = this.resolveState(selectedDaySchedule, weekdayIndex, weekIndex).timingText;
    
            if (ttext != "Сегодня занятия кончились" && ttext != "Занятий нет"){ // xdddddddd not sorry)))
                return {
                    weekIndex: weekIndex,
                    weekdayIndex: weekdayIndex
                }
            }

        }

                
    
        // not found anything
        return {
            weekIndex: this.todayWeekIndex,
            weekdayIndex: this.todayWeekdayIndex
        }
    }


    // creates html element and adds to page
    addLesson(lesson, highlighted) {
        const lessonDiv = document.createElement('div');
        lessonDiv.classList.add('lesson');

        if (highlighted) {
            lessonDiv.classList.add('selected'); 
        }

        
        
        const heading = document.createElement('h2');
        heading.textContent = lesson.name;
        
        const timeParagraph = document.createElement('p');
        timeParagraph.textContent = lesson.start_time + ' - ' + lesson.end_time;
        
        const roomParagraph = document.createElement('p');
        roomParagraph.textContent = (lesson.room == '') ? '' : 'каб. ' + lesson.room;
        
        const teacherParagraph = document.createElement('p');
        teacherParagraph.textContent = lesson.teacher;
        

        
        const lesson_detailsDiv = document.createElement('div');
        lesson_detailsDiv.classList.add('lesson_details');

        const timeDiv = document.createElement('div');
        timeDiv.classList.add('time');

        const additional_infoDiv = document.createElement('div');
        additional_infoDiv.classList.add('additional_info');
        
        
        
        lessonDiv.appendChild(heading);

        timeDiv.appendChild(timeParagraph);
        additional_infoDiv.appendChild(roomParagraph);
        additional_infoDiv.appendChild(teacherParagraph);
        
        lesson_detailsDiv.appendChild(timeDiv);
        lesson_detailsDiv.appendChild(additional_infoDiv);
        
        lessonDiv.appendChild(lesson_detailsDiv);

        const container = document.getElementById('lesson_list');
        container.appendChild(lessonDiv);
    }

    // creates html element and adds to page
    addWeekday(weekdayObj, highlighted) {
        const weekdayDiv = document.createElement('div');
        weekdayDiv.classList.add('weekday');

        if (highlighted) {
            weekdayDiv.classList.add('selected'); 
        }

        const weekday = document.createElement('h2');
        weekday.textContent = weekdayObj.name;

        const date = document.createElement('p');
        date.textContent = weekdayObj.date;

        const month = document.createElement('p');
        month.textContent = weekdayObj.month;

        weekdayDiv.appendChild(weekday);
        weekdayDiv.appendChild(date);
        weekdayDiv.appendChild(month);

        weekdayDiv.addEventListener('click', function() {
            reload(weekdayObj.weekdayIndex, weekdayObj.weekIndex);
        });

        const container = document.getElementById('weekday_list');
        container.appendChild(weekdayDiv);
    }

    addArrow(weekdayObj, arrowDirection) {
        const weekdayDiv = document.createElement('div');
        weekdayDiv.classList.add('weekday');

        const direction = document.createElement('h2');
        direction.textContent = arrowDirection > 0 ? ">" : "<";

        weekdayDiv.appendChild(direction);

        weekdayDiv.addEventListener('click', function() {
            reload(weekdayObj.weekdayIndex, 
                (weekdayObj.weekIndex + arrowDirection > 0 ? 
                    weekdayObj.weekIndex + arrowDirection : 
                    weekdayObj.weekIndex + arrowDirection + weekdayObj.cycle) 
                % weekdayObj.cycle);
        });

        const container = document.getElementById('weekday_list');
        container.appendChild(weekdayDiv);
    }

    displayArrow(direction){
        const reletiveWeekIndex = (this.selectedWeekIndex - this.todayWeekIndex) + (this.selectedWeekIndex - this.todayWeekIndex < 0 ? this.scheduleCycle : 0);

        if (direction > 0){
            if (reletiveWeekIndex < this.scheduleCycle - 1) {
                this.addArrow({weekdayIndex: this.selectedWeekdayIndex,
                               weekIndex: this.selectedWeekIndex,
                               cycle: this.scheduleCycle}, direction);
            }
        } else {
            if (reletiveWeekIndex > 0) {
                this.addArrow({weekdayIndex: this.selectedWeekdayIndex,
                               weekIndex: this.selectedWeekIndex,
                               cycle: this.scheduleCycle}, direction);
            }
        }
    }

    removeLessons() {
        let toRemove = document.getElementsByClassName("lesson");

        while(toRemove.length > 0) {
            toRemove[0].remove();
        }
    }

    removeWeekdays() {
        let toRemove = document.getElementsByClassName("weekday");
        
        while(toRemove.length > 0) {
            toRemove[0].remove();
        }
    }

    displaySchedule() {
        this.removeLessons();

        const selectedDaySchedule = this.schedule.schedule[this.selectedWeekIndex][
            ["mon","tue","wed","thu","fri","sat","sun"].at(this.selectedWeekdayIndex)
        ]
        
        const state = this.resolveState(selectedDaySchedule);

        
        for (let i = 0; i < selectedDaySchedule.length; i++) {
            this.addLesson(selectedDaySchedule[i], i == state.highlightedLessonIndex);
        }
        

        document.getElementById("timing_text").innerHTML = "<strong>" + state.timingText + "<strong>";

    }

    displayWeekdays() {
        const weekdayNames = ["Пн","Вт","Ср","Чт","Пт","Сб","Вс"];
        const monthNames = ["янв","фев","мар","апр","май","июн","июл","авг","сен","окт","ноя","дек"];

        this.removeWeekdays();

        const monday = new Date();
        monday.setDate(monday.getDate() - this.todayWeekdayIndex + 
                       7 * (this.selectedWeekIndex > this.todayWeekIndex ? 
                            (this.selectedWeekIndex - this.todayWeekIndex) : 
                            (this.todayWeekIndex - this.selectedWeekIndex)));


        this.displayArrow(-1);

        for (let i = 0; i <  7; i++) {
            const day = new Date(monday);
            day.setDate(monday.getDate() + i);

            const dayAndMonth = day.toLocaleDateString("ru-RU").split('.');

            this.addWeekday({
                name: weekdayNames[i],
                date: dayAndMonth[0],
                month: monthNames[Number(dayAndMonth[1]) - 1],
                weekdayIndex: i,
                weekIndex: this.selectedWeekIndex
            }, (i == this.selectedWeekdayIndex));
        }

        this.displayArrow(1);

    }

    resolveState(daySchedule, selectedWeekdayIndexOverride = -1, selectedWeekIndexOverride = -1) {
        let text = "Ошибка";
        let lessonIndex = -1;

        if (selectedWeekIndexOverride == -1 || selectedWeekdayIndexOverride == -1){
            selectedWeekIndexOverride = this.selectedWeekIndex;
            selectedWeekdayIndexOverride = this.selectedWeekdayIndex;
        }
        
        const reletiveWeekIndex = (selectedWeekIndexOverride - this.todayWeekIndex) + (selectedWeekIndexOverride - this.todayWeekIndex < 0 ? this.scheduleCycle : 0);
        let daysTillselected = 7 * reletiveWeekIndex + selectedWeekdayIndexOverride - this.todayWeekdayIndex;
        
        if (daysTillselected < 0) {
            
            text = "Уже закончились";
            
        } else if (daysTillselected > 0) {

            daysTillselected--; // через 1 день != завтра (?)

            if (daysTillselected == 0 || daysTillselected == 1){
                text = ["Завтра","Послезавтра"].at(daysTillselected);    
                
            } else if ((daysTillselected % 100 - daysTillselected % 10) == 10) {
                text = "Через " + daysTillselected + " дней";

            } else {
                text = "Через " + daysTillselected + " " + 
                ["дней","день","дня","дня","дня","дней","дней","дней","дней","дней",].at(daysTillselected % 10);
            
            }
            
        } else {
            
            const today = new Date();
            const currentTime = 60 * today.getHours() + today.getMinutes();
            
            for (let i = 0; i < daySchedule.length; i++) {
                const startTime = getMinutes(daySchedule[i].start_time);
                const endTime = getMinutes(daySchedule[i].end_time);

                if (currentTime < endTime) {
                    if (currentTime < startTime){

                        text = "До начала " + (Math.floor((startTime - currentTime)/60) > 0 ? 
                            (Math.floor((startTime - currentTime)/60)) + " часов " : "") 
                            + ((startTime - currentTime) % 60) + " мин.";
                        lessonIndex = i;

                        break;

                    } else {

                        text = "До конца " + (endTime - currentTime) + " мин";
                        lessonIndex = i;
                        break;

                    }
                } else {
                    text = "Сегодня занятия кончились";
                }
            }

        }
        
        if (daySchedule.length == 0) text = "Занятий нет";

        return {
            highlightedLessonIndex: lessonIndex,
            timingText: text
        };
    }
}
