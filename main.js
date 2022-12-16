const {app, BrowserWindow, ipcMain, session, ipcRenderer} = require('electron')
const Store = require('electron-store');
const electronLocalshortcut = require('electron-localshortcut')
const path = require('path')
var request = require('request');

const store = new Store();

let mainWindow = null
let childWindow = null

const firstRun = require('electron-first-run');

const isFirstRun = firstRun()
if (isFirstRun == true) {
  store.set('student_id', "");
  store.set('password', "");
}

function createWindow () {
  // Create the browser window.
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    show: true,
    resizable: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js')
    }
  })
  mainWindow.removeMenu();
  
  // Open the DevTools.
  electronLocalshortcut.register(mainWindow, 'F12', () => {
    console.log('F12 is pressed')
    mainWindow.webContents.toggleDevTools()
  });
  // mainWindow.webContents.openDevTools()
  
  // register F5: 화면 reload하기 위한 단축키로 F5를 등록
  electronLocalshortcut.register(mainWindow, 'F5', () => {
    console.log('F5 is pressed')
    mainWindow.reload();
  });
  
  // and load the index.html of the app.
  mainWindow.loadFile(path.join(__dirname, 'index.html'))

  mainWindow.on('closed', function () {
    mainWindow = null
    app.quit()
  })
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  createWindow()

  // getWorkInfo('202212');

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
    
  })
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit()
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
ipcMain.on('refreshWorkInfoInMain', (event, data) => {
  getWorkInfo(data.month, data.student_id, data.password)
  .then((data) => {
    if (data !== false) {
      mainWindow.webContents.send("getWorkInfoFromMain", data);
    }
  });
})

ipcMain.on('getAuthDataMain', (event, html) => {
  console.log("Getting Auth Data");
  mainWindow.webContents.send("getAuthInfoFromMain", {student_id: store.get('student_id'), password: store.get('password')});
})

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

var work_info = {};
var working = false;
let getWorkInfo = (month, student_id, password) => new Promise((resolve) => {
  if (working == true) {
    resolve(false)
    return
  }
  working = true;
  console.log("Getting work info..", month);

  session.defaultSession.clearStorageData({storages: ['cookies']})
  .then(() => {
      console.log('All cookies cleared');

    childWindow = new BrowserWindow({
      parent: mainWindow,
      center: true,
      minWidth: 1200,
      minHeight: 500,
      show: false,
      webPreferences: {
        nodeIntegration: false, // https://electronjs.org/docs/tutorial/security#2-d%C3%A9sactiver-lint%C3%A9gration-de-nodejs-dans-tous-les-renderers-affichant-des-contenus-distants
        // preload: path.join(__dirname, 'app/js/login.js'),
        // enableRemoteModule: true,
      }
    })
    
    // childWindow.webContents.openDevTools()
  
    childWindow.loadURL('https://underwood1.yonsei.ac.kr', { userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Safari/537.36' })
  
    // Login
    childWindow.webContents.once('dom-ready', () => {    
      console.log(1);
      childWindow.webContents.once('dom-ready', () => {    
        console.log(2);
        childWindow.webContents.once('dom-ready', () => {    
          console.log(3);
          childWindow.webContents.once('dom-ready', () => {   
            console.log(4);
            childWindow.webContents.executeJavaScript("$('loginId').value = '"+student_id+"'");
            childWindow.webContents.executeJavaScript("$('loginPasswd').value = '"+password+"'");
            childWindow.webContents.executeJavaScript("fSubmitSSOLoginForm()");
  
            childWindow.webContents.once('dom-ready', () => {   
              console.log(5);
              // if (childWindow.webContents.getURL() == true) {
              //   resolve("wrong_password")
              //   childWindow.close();
              //   return
              // }
              childWindow.webContents.once('dom-ready', () => {   
                console.log(6);
                childWindow.webContents.once('dom-ready', async () => {   
                  parseWorkInfo(month, student_id, password, resolve);

                })
              })
            })
          })
        })
      })
    })
  
    childWindow.on('close', function(){
      console.log("Browser closed.");
      working = false;
      childWindow=null;
    });
  })
  .catch((error) => {
      console.error('Failed to clear cookies: ', error);
  });
  
  
});

function parseWorkInfo(month, student_id, password, resolve) {
  console.log("Logged in.");
                  
  session.defaultSession.cookies.get({url: 'https://underwood1.yonsei.ac.kr'})
  .then((cookies) => {
    var cookie_str = '';
    for (var i=0;i<cookies.length;i++) {
      cookie_str += cookies[i]['name'] + '=' + cookies[i]['value'] + '; '
    }

    let getHolidayInfo = () => new Promise((resolve) => {
      // 공휴일 정보 
      var options = {
        'method': 'POST',
        'url': 'https://underwood1.yonsei.ac.kr/com/csys/sscm/DataCtr/findHldy.do',
        'headers': {
          'Cookie': cookie_str,
          'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        },
        body: '_menuId=MTA5NjIxODk2NTM3MTExMzcwMDA%3D&_menuNm=%EA%B0%9C%EC%9D%B8%EB%B3%84%EB%B3%B5%EB%AC%B4%EC%83%81%ED%99%A9%EB%B6%80&_pgmId=NDE2NzU5OTgzOTE%3D&'
      
      };
      request(options, function (error, response) {
        if (error) throw new Error(error);
        var r = JSON.parse(response.body);
        mainWindow.webContents.send("getHolidayInfoFromMain", r);
        resolve(r);
      });
    })

    let getCodeInfo = () => new Promise((resolve) => {
      // 복무상황변경 코드
      var options = {
        'method': 'POST',
        'url': 'https://underwood1.yonsei.ac.kr/com/csys/sscm/CodeCtr/findCodeComboList.do',
        'headers': {
          'Cookie': cookie_str,
          'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        },
        body: '_menuId=MTA5NjIxODk2NTM3MTExMzcwMDA%3D&_menuNm=%EA%B0%9C%EC%9D%B8%EB%B3%84%EB%B3%B5%EB%AC%B4%EC%83%81%ED%99%A9%EB%B6%80&_pgmId=NDE2NzU5OTgzOTE%3D&%40d1%23cmmnCd=STRP0020&%40d1%23useYn=&%40d1%23textMode=&%40d1%23outDS=dsSrvicDivCd&%40d1%23sts=&%40d1%23cmmnCd=STRP0030&%40d1%23useYn=&%40d1%23textMode=&%40d1%23outDS=dsSrvicDetlDivCd&%40d1%23sts=&%40d1%23cmmnCd=STRP0050&%40d1%23useYn=&%40d1%23textMode=&%40d1%23outDS=dsSrvicVartnAplySttusCd&%40d1%23sts=&%40d1%23cmmnCd=STRP0040&%40d1%23useYn=&%40d1%23textMode=&%40d1%23outDS=dsLastAprvlDivCd&%40d1%23sts=&%40d%23=%40d1%23&%40d1%23=dsCommExbuilderCodeParam&%40d1%23tp=ds&'
      
      };
      request(options, function (error, response) {
        if (error) throw new Error(error);
        var r = JSON.parse(response.body);
        mainWindow.webContents.send("getCodeInfoFromMain", r);
        resolve(r);
      });
    })
    
    let getWeekInfo = () => new Promise((resolve) => {
      // 해당월 주차 정보 
      var options = {
        'method': 'POST',
        'url': 'https://underwood1.yonsei.ac.kr/sch/strp/StrpsvCtr/findWeekPeriodList.do',
        'headers': {
          'Cookie': cookie_str,
          'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        },
        body: '_menuId=MTE1NjAwMDg2MDk3MTg4NzQwMDA%3D&_menuNm=%EC%9C%A0%EC%97%B0%EA%B7%BC%EB%AC%B4%EC%A1%B0%ED%9A%8C&_pgmId=NjgzOTM3NTcyNjY%3D&%40d1%23dclzMm='+month+'&%40d1%23stunoNm=&%40d1%23campsBusnsCd=&%40d1%23univCd=&%40d1%23faclyCd=&%40d1%23majorCd=&%40d1%23startDt=&%40d%23=%40d1%23&%40d1%23=dmCond&%40d1%23tp=dm&'
      
      };
      request(options, function (error, response) {
        if (error) throw new Error(error);
        resolve(JSON.parse(response.body));
      });
    })

    let getWorkHistory = (start_dt, i) => new Promise((resolve) => {
      // 해당 주 출퇴근 정보
      var options = {
        'method': 'POST',
        'url': 'https://underwood1.yonsei.ac.kr/sch/strp/StrpsvCtr/findWeekTmCdSlfList.do',
        'headers': {
          'Cookie': cookie_str,
          'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        },
        body: '_menuId=MTE1NjAwMDg2MDk3MTg4NzQwMDA%3D&_menuNm=%EC%9C%A0%EC%97%B0%EA%B7%BC%EB%AC%B4%EC%A1%B0%ED%9A%8C&_pgmId=NjgzOTM3NTcyNjY%3D&%40d1%23dclzMm='+month+'&%40d1%23stunoNm=&%40d1%23campsBusnsCd=&%40d1%23univCd=&%40d1%23faclyCd=&%40d1%23majorCd=&%40d1%23startDt='+start_dt+'&%40d%23=%40d1%23&%40d1%23=dmCond&%40d1%23tp=dm&'
      
      };
      request(options, function (error, response) {
        if (error) throw new Error(error);
        console.log(start_dt);
        resolve([JSON.parse(response.body), i]);
      });
    })

    let getApplicationInfo = () => new Promise((resolve) => {
      // 복무상황변경 신청내역 
      var options = {
        'method': 'POST',
        'url': 'https://underwood1.yonsei.ac.kr/sch/strp/StrpsvCtr/findAplyForChgList.do',
        'headers': {
          'Cookie': cookie_str,
          'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        },
        body: '_menuId=MTA5NjIxODk2NTM3MTExMzcwMDA%3D&_menuNm=%EA%B0%9C%EC%9D%B8%EB%B3%84%EB%B3%B5%EB%AC%B4%EC%83%81%ED%99%A9%EB%B6%80&_pgmId=NDE2NzU5OTgzOTE%3D&%40d1%23dclzDt='+month+'&%40d%23=%40d1%23&%40d1%23=dmCond&%40d1%23tp=dm&'
      
      };
      request(options, function (error, response) {
        if (error) throw new Error(error);
        var r = JSON.parse(response.body);
        mainWindow.webContents.send("getApplicationInfoFromMain", r);
        resolve(r);
      });
    })
    
    getWeekInfo().then((week_results) => {
      const weeks = week_results["dsWeekDt"];
      work_info[month] = [];

      let promises = [];
      for (var i=0;i<weeks.length;i++) {
        var p = getWorkHistory(weeks[i]["startDt"], i).then((r) => {
          weeks[r[1]]["info"] = r[0];

          work_info[month].push(weeks[r[1]]);
        });

        promises.push(p);
      }

      getHolidayInfo()
      getCodeInfo()
      // getApplicationInfo()

      Promise.all(promises).then(() => {

        getApplicationInfo().then(() => {
          console.log("All done");
          console.log(work_info);

          store.set('student_id', student_id);
          store.set('password', password);

          resolve(work_info);
          childWindow.close();
        })
      })
      
    });
    

  }).catch((error) => {
    console.log(error)
  })
}