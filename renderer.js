/**
 * This file is loaded via the <script> tag in the index.html file and will
 * be executed in the renderer process for that window. No Node.js APIs are
 * available in this process because `nodeIntegration` is turned off and
 * `contextIsolation` is turned on. Use the contextBridge API in `preload.js`
 * to expose Node.js functionality from the main process.
 */
let today = new Date();
let current_date = new Date();
let month = strftime("%Y%m", today);
let work_info = undefined;
let week_info = {};
let holiday_info = undefined;
let application_code = undefined;
let application_info = undefined;

document.getElementById('refresh').addEventListener('click', function() {
  submitForm();
},false)

document.getElementById('refresh_form').addEventListener('click', function() {
  submitForm();
},false)

document.addEventListener("DOMContentLoaded", function(){
  renderCalendar(today);
  changeHeading(today);

  window.api.getAuth()
  // var student_id = document.getElementById("student_id").value;
  // var password   = document.getElementById("password").value;
  const password_node = document.getElementById("password");
  password_node.addEventListener("keyup", function(event) {
      if (event.key === "Enter") {
          submitForm();
      }
  });

  const student_id_node = document.getElementById("student_id");
  student_id_node.addEventListener("keyup", function(event) {
      if (event.key === "Enter") {
          submitForm();
      }
  });
 
});

// 인증 정보 수신
window.api.startAuthListener((event, response) => {
  if (!response) return;
  console.log(response)

  if (response.student_id !== undefined) {
    document.getElementById("student_id").value = response.student_id;
  }
  if (response.password !== undefined) {
    document.getElementById("password").value = response.password;
  }

  var student_id = document.getElementById("student_id").value;
  var password   = document.getElementById("password").value;

  if (student_id !== undefined && student_id !== "" && password !== undefined && password !== "") {
    submitForm();
  }
});

// 휴일 정보 수신
window.api.startHolidayInfoListener((event, response) => {
  if (!response) return;
  holiday_info = response.dsCsys030;
  console.log("휴일정보", holiday_info)
  
});

// 복무상황변경 코드 수신
window.api.startCodeInfoListener((event, response) => {
  if (!response) return;
  application_code = response;
  console.log("복무상황변경 코드", application_code)
  
});

// 복무상황변경 신청내역 수신
window.api.startApplicationInfoFromMain((event, response) => {
  if (!response) return;
  application_info = response.dsStrp210;
  console.log("복무상황변경 신청내역", application_info)
  
});

function submitForm() {
  console.log("Refresh clicked!");
  document.getElementById("refresh_icon").classList.add('rotate');

  var student_id = document.getElementById("student_id").value;
  var password   = document.getElementById("password").value;

  if (student_id === "") {
    alert("학번을 입력하세요.");
    return
  }

  if (password === "") {
    alert("비밀번호를 입력하세요.");
    return
  }

  window.api.refreshWorkInfo(month, student_id, password, {callback: (result) => {
    
  }})
}

// 복무 정보 수신
window.api.startWorkInfoListener((event, response) => {
  if (!response) return;
  if (response === "wrong_password") {
    alert("아이디와 비밀번호를 확인하여주세요.");
  } else {
    console.log(`API responded at: ${new Date().toString()}`);
    work_info = parseWorkDays(response[month])
    renderWorkInfo(work_info);
    renderWorkDetail(work_info, current_date);
    renderApplicationInfo(application_info, application_code);
  }
  document.getElementById("refresh_icon").classList.remove('rotate');
});

function renderCalendar(today) {
  var d1 = new Date(today.getTime());;
  d1.setDate(1);
  
  var d1_o = strftime("%o", d1);

  var first_day_in_cal = new Date(today.getTime());
  first_day_in_cal.setDate(2-d1_o);

  var last_day_in_cal = new Date(today.getTime());
  last_day_in_cal = last_day_in_cal.addMonths(1);
  last_day_in_cal.setDate(0);

  if (strftime("%o", last_day_in_cal) == 0) {
    last_day_in_cal = last_day_in_cal.addDays(-2);
  } else if (strftime("%o", last_day_in_cal) == 6) {
    last_day_in_cal = last_day_in_cal.addDays(-1);
  } else {
    last_day_in_cal = last_day_in_cal.addDays(5 - strftime("%o", last_day_in_cal))
  }

  // Week Loop

  var d = new Date(first_day_in_cal.addDays(-1).getTime());
  var week_idx = 0;
  for (var w = first_day_in_cal.weekOfYear(); w <= last_day_in_cal.weekOfYear(); w++) {
    var week_row = document.createElement('section');
    week_row.classList.add('calendar__week');

    for (var j=0;j<5;j++) {
      d = d.addDays(1);

      var day_div = document.createElement('div')
      day_div.classList.add('calendar__day')

      day_div.id = strftime("%Y%m%d", d);

      if (d.getMonth() !== today.getMonth()) {
        day_div.classList.add('inactive');
      }

      if (strftime("%Y-%m-%d", d) == strftime("%Y-%m-%d", today)) {
        day_div.classList.add('today');
      }

      var date_span = document.createElement('span');
      date_span.classList.add('calendar__date');

      date_span.textContent = d.getDate();

      var task_span = document.createElement('span');
      task_span.classList.add('calendar__task');

      day_div.append(date_span);
      day_div.append(task_span);

      day_div.addEventListener('click', function(event) {
        var closest = event.target.closest('div');
        dateCellCallback(closest.id);
      });

      week_row.append(day_div);
    }
    // 토요일 자리 (추가 정보용)
    var day_div = document.createElement('div')
    day_div.classList.add('calendar__day')

    var date_span = document.createElement('span');
    date_span.classList.add('calendar__date');

    var task_span = document.createElement('span');
    task_span.classList.add('calendar__task');
    task_span.id = week_idx.toString();

    day_div.append(date_span);
    day_div.append(task_span);

    week_row.append(day_div);

    d = d.addDays(2);

    document.getElementById("calendar").append(week_row);
    week_idx++;
  }
}

function dateCellCallback(d) {
  var date = parseDate(d);
  current_date = new Date(date.getTime());
  changeHeading(date);
  renderWorkDetail(work_info, date)
}

function changeHeading(d) {
  document.getElementById("today_heading").innerHTML = strftime("%m월 %d일", d) + "<br>" +strftime("%A", d);
  document.getElementById("year_title").innerHTML = strftime("%Y년 %m월", d) + " 전문연구요원 복무현황";

  var elems = document.querySelectorAll(".calendar__day");
  [].forEach.call(elems, function(el) {
    el.classList.remove("today");
  });

  var day_div = document.getElementById(strftime("%Y%m%d", d));
  day_div.classList.add('today')
}

function parseWorkDays(response) {
  var work_info = {};
  // var week_info = {};
  var r = response.sort((a, b) => parseInt(a.startDt) - parseInt(b.startDt));
  
  for (var i=0;i<r.length;i++) {
    var week = r[i];
    var info_list = week.info.dsStrp200;

    if (info_list.length == 1) {
      var info = info_list[0];
      week_info[i] = {
        dispTotWorkTime: info["dispTotWorkTime"]
      }
      // console.log(info)
      var temp_total_work_time_m = 0;
      for (var j=1;j<=5;j++) {
        var attend_time = info["attndDttm"+j.toString()];
        if (attend_time !== null) {
          var k = attend_time.substr(0,8)
          var date = parseDate(k)
          
          attend_time = parseDateTime(attend_time);
          var break_time = info["breakTime"+j.toString()]

          var work_time = info["workTime"+j.toString()]

          var left_time = info["lvffcDttm"+j.toString()]
          if (left_time !== null) {
            left_time = parseDateTime(left_time);
          }

          work_info[k] = {
            d: date,
            attend_time: attend_time,
            break_time: break_time,
            work_time: work_time,
            left_time: left_time

          }

          // 시스템 정상화 전 임시 스크립트 계산
          if (left_time !== null) {
            var work_result = calWorkTime(attend_time, left_time);
            work_info[k]["break_time_m"] = work_result[0];
            work_info[k]["work_time_m"] = work_result[1];
            work_info[k]["work_time"] = work_result[2];

            temp_total_work_time_m += work_info[k]["work_time_m"];
          }
          
        }       
      }

      // override total week worktime with temp script
      week_info[i].dispTotWorkTime = (Math.floor((temp_total_work_time_m / 60))).toString() + "시간 " + (temp_total_work_time_m % 60).toString() + "분";
    }
  }

  return work_info
}

function renderWorkInfo(work_info) {
  for (var date of Object.keys(work_info)) {
    var info = work_info[date];
    var day_div = document.getElementById(date);
    var task_span = day_div.childNodes[1];

    if (info["work_time"] != null) {
      task_span.textContent = info["work_time"];
    } else {
      task_span.textContent = strftime("%H:%M", info["attend_time"]) + " 출근";
    }
  }

  for (var week_idx of Object.keys(week_info)) {
    document.getElementById(week_idx).textContent = week_info[week_idx].dispTotWorkTime;
  }
}

function renderWorkDetail(work_info, date) {
  var d = strftime("%Y%m%d", date);
  if (work_info[d] !== undefined) {
    document.getElementById("attend_time").textContent = "";
    document.getElementById("break_time").textContent = "";
    document.getElementById("left_time").textContent = "";
    document.getElementById("work_time").textContent = "";
    document.getElementById("application").textContent = "";

    if (work_info[d].attend_time !== null && work_info[d].attend_time !== undefined) {
      console.log(work_info[d].attend_time)
      document.getElementById("attend_time").textContent = strftime("%H시 %M분", work_info[d].attend_time);
    }

    if (work_info[d].break_time !== null && work_info[d].break_time !== undefined) {
      document.getElementById("break_time").textContent = work_info[d].break_time;
      // override with temp script
      if (work_info[d].break_time_m !== null && work_info[d].break_time_m !== undefined) {
        var break_time_m = work_info[d].break_time_m;
        document.getElementById("break_time").textContent = (Math.floor((break_time_m / 60))).toString() + "시간 " + (break_time_m % 60).toString() + "분";
      }
    }
    
    if (work_info[d].left_time !== null && work_info[d].left_time !== undefined) {
      document.getElementById("left_time").textContent = strftime("%H시 %M분", work_info[d].left_time);
    }
    if (work_info[d].work_time !== null && work_info[d].work_time !== undefined) {
      document.getElementById("work_time").textContent = work_info[d].work_time;
    }
    if (work_info[d].application !== null && work_info[d].application !== undefined) {
      document.getElementById("application").textContent = work_info[d].application;
    }
  } else {
    console.error("No data");

    document.getElementById("attend_time").textContent = "";
    document.getElementById("break_time").textContent = "";
    document.getElementById("left_time").textContent = "";
    document.getElementById("work_time").textContent = "";
    document.getElementById("application").textContent = "";
  }
}

// 복무 상황 변경
function renderApplicationInfo(info_list, code) {
  info_list.sort((a, b) => parseInt(a.aplyDt) - parseInt(b.aplyDt));

  for (var i=0; i < info_list.length; i++) {
    var info = info_list[i];

    // 승인
    var service_status = code.dsSrvicVartnAplySttusCd.find(o => o.code === info.srvicVartnAplySttusCd);
    var service_division = code.dsSrvicDivCd.find(o => o.code === info.srvicDivCd);
    var service_detail = code.dsSrvicDetlDivCd.find(o => o.code === info.srvicDetlDivCd);

    var application_text = service_detail.fullNm + " (" + service_status.fullNm + ")";
    
    // TODO: 연차, 반차 등 시작/종료 시간에 맞춰 시간 계산
    var sdate = info.aplyBeginDt.substr(0, 8);
    var edate = info.aplyEndDt.substr(0, 8);

    for(var date=parseInt(sdate); date<=parseInt(edate); date++) {
      if (work_info[date] === undefined) {
        work_info[date] = {}
      }
      
      work_info[date]["application"] = application_text;

      if (info.srvicVartnAplySttusCd == "30") {
        var day_div = document.getElementById(date);
        var task_span = day_div.childNodes[1];

        day_div.classList.add('inactive');
        task_span.textContent = service_detail.fullNm;
      }
    }
    // info.srvicVartnAplySttusCd : 10(작성중) 20(신청) 30(승인) 90(반려)
    

  }
}