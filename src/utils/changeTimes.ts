// alarms를 순서정렬해줌
export const orderAlarms = (alarms : Array<string>) => {
    const alarmsNumber = alarms.map((value)=> {
            const {timeNumber} = changeTimetoNumber(value);
            return timeNumber;
        });
    const sortedAlarms = alarmsNumber.sort((a,b)=>a-b)
        .map((value)=>changeTimetoString(value));
    return sortedAlarms;
}

// number형(2340)을 string형(11:40 PM)으로 바꿔줌
export const changeTimetoString = (time : number) => {
    const hour24Number = Math.floor(time/100);
    const minuteString = (time%100).toString().padStart(2,'0');
    if(hour24Number === 0){
        return `12:${minuteString} AM`;
    }
    if(hour24Number < 12){
        return `${hour24Number.toString()}:${minuteString} AM`;
    }
    if(hour24Number === 12){
        return `12:${minuteString} PM`;
    }
    else {
        return `${(hour24Number-12).toString()}:${minuteString} PM`;
    }
}

// string형(11:40 PM)을 number형{2340, 23, 11, 40, PM} 으로 바꿔줌
export const changeTimetoNumber = (time : string) => {
    const [hourMinute, ampm] = time.split(" ");
    const [hour, minute] = hourMinute.split(":");
    let hourNumber = Number(hour);
    const hour12Number = hourNumber;
    let minuteNumber = Number(minute);
    if(ampm === "PM" && hour !== "12"){
        hourNumber = hourNumber + 12;
    }
    if(ampm ==="AM" && hour === "12"){
        hourNumber = 0;
    }
    return {
        timeNumber : hourNumber*100 + minuteNumber,
        hour24Number : hourNumber,
        hour12Number : hour12Number,
        minuteNumber : minuteNumber,
        ampm : ampm,
    }
}

// timeZone에 따라 UTC시간으로 변환해줌 (2340 to UTC)
export const changeTimetoUTC = (time : number) => {
    const date = new Date();
    const offsetMinutes = date.getTimezoneOffset(); //-345
    const offsetOnlyHours = Math.trunc(offsetMinutes / 60); //-5
    const offsetOnlyMinutes = offsetMinutes % 60; //-45
    const timeOnlyHours = Math.trunc(time/100);
    const timeOnlyMinutes = time % 100;

    let newOnlyHours = timeOnlyHours + offsetOnlyHours;
    let newOnlyMinutes = timeOnlyMinutes + offsetOnlyMinutes;
    if(newOnlyMinutes >= 60) {
        newOnlyMinutes = newOnlyMinutes - 60;
        newOnlyHours = newOnlyHours + 1;
    }
    if(newOnlyMinutes < 0) {
        newOnlyMinutes = 60 + newOnlyMinutes;
        newOnlyHours = newOnlyHours - 1;
    }
    if(newOnlyHours >= 24) {newOnlyHours = newOnlyHours - 24;}
    if(newOnlyHours < 0 ) {newOnlyHours = 24 + newOnlyHours;}

    return 100*newOnlyHours + newOnlyMinutes;
}

// timeZone에 따라 Local시간으로 변환해줌 (0035 to Local)
export const changeTimetoLocal = (time : number) => {
    const date = new Date();
    const offsetMinutes = date.getTimezoneOffset();
    const offsetOnlyHours = Math.trunc(offsetMinutes / 60);
    const offsetOnlyMinutes = offsetMinutes % 60;
    const timeOnlyHours = Math.trunc(time/100);
    const timeOnlyMinutes = time % 100;

    let newOnlyHours = timeOnlyHours - offsetOnlyHours;
    let newOnlyMinutes = timeOnlyMinutes - offsetOnlyMinutes;
    if(newOnlyMinutes >= 60) {
        newOnlyMinutes = newOnlyMinutes - 60;
        newOnlyHours = newOnlyHours + 1;
    }
    if(newOnlyMinutes < 0) {
        newOnlyMinutes = 60 + newOnlyMinutes;
        newOnlyHours = newOnlyHours - 1;
    }
    if(newOnlyHours >= 24) {newOnlyHours = newOnlyHours - 24;}
    if(newOnlyHours < 0 ) {newOnlyHours = 24 + newOnlyHours;}

    return 100*newOnlyHours + newOnlyMinutes;
}

// timeZone에 따라 UTC날짜-시간 형태의 FCM Topic으로 변환해줌 (2340 to FCM Topic)
export const changeTimetoFCMTopic = (time : number) => {
    const date = new Date();
    const offsetMinutes = date.getTimezoneOffset(); //-345
    const offsetOnlyHours = Math.trunc(offsetMinutes / 60); //-5
    const offsetOnlyMinutes = offsetMinutes % 60; //-45
    const timeOnlyHours = Math.trunc(time/100);
    const timeOnlyMinutes = time % 100;

    let newOnlyHours = timeOnlyHours + offsetOnlyHours;
    let newOnlyMinutes = timeOnlyMinutes + offsetOnlyMinutes;
    if(newOnlyMinutes >= 60) {
        newOnlyMinutes = newOnlyMinutes - 60;
        newOnlyHours = newOnlyHours + 1;
    }
    if(newOnlyMinutes < 0) {
        newOnlyMinutes = 60 + newOnlyMinutes;
        newOnlyHours = newOnlyHours - 1;
    }
    if(newOnlyHours >= 24) {
        newOnlyHours = newOnlyHours - 24;
        date.setDate(date.getDate()+1);
    }
    if(newOnlyHours < 0) {
        newOnlyHours = 24 + newOnlyHours;
        date.setDate(date.getDate()-1);
    }

    const utcFullDate = date.getFullYear() * 10000 + (date.getMonth()+1) * 100 + date.getDate();
    const utcTimeNumber = 100*newOnlyHours + newOnlyMinutes;
    const fcmTopic = `${utcFullDate.toString()}${utcTimeNumber.toString()}`;
    return fcmTopic;
}