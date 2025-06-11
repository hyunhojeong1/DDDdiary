export const getCurrentDate = () => {
    const date = new Date();
    const nowTimeNumber = date.getHours()*100 + date.getMinutes();
    let timeZoneMinutes = date.getTimezoneOffset();
    if(timeZoneMinutes <= -720) {
        timeZoneMinutes = 720;
    }
    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const pastDate = new Date(date);
    pastDate.setDate(pastDate.getDate()-15);
    const pastFulldate = 10000*(pastDate.getFullYear()-2000) + 100*(pastDate.getMonth()+1) + pastDate.getDate();
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    return {
        dateISO : date.toISOString(),
        year: date.getFullYear()-2000,
        month: date.getMonth() + 1,
        day: date.getDate(),
        weekday: days[date.getDay()],
        fulldate : 10000*(date.getFullYear()-2000) + 100*(date.getMonth()+1) + date.getDate(),
        past14Date : pastFulldate,
        currentTimeZone : timeZone,
        currentTimeZoneMinutes : timeZoneMinutes,
        currentTimeNumber : nowTimeNumber,
    };
}

