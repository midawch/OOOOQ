import {ws, hostObj, clientId} from "./../../config.js"
import fetch from "./../../fetch/index.js"
// //获取应用实例
const app = getApp()
let doWorkTimer = {}
let doWorkTime = 0
let hisDoworkTime = 0
const ctx = wx.createCanvasContext('timeCanvas')
Page({
  data: {
    socketOpen: false, //是否连接webSocket
    step: 1,   //步骤
    titleNumber: 0,  //题号
    waitTime: 3,  //匹配等待时间
    userInfo: {},
    isWin: false,
    gamer: {}, //对手详细信息
    readyTime: '已找到对局',  //准备时间
    isMove: false,
    Lheight: 40,
    Rheight: 30,
    isNextNum: false, //题号切换标记
    isNextAnswer: false, //答案切换标记
    wordsArr: [
    ],
    currentWordIndex: 0,
    doWorkTimer: {},  //做作业的公共定时器
    canvasTimer: {},  //倒计时定时器
    restoreTimer: {},
    isOver: false, // 做题结束标记
    time: 10, //倒计时时间
    settings: {
      size: 70,            // 绘制圆形的最大尺寸，宽=高
      borderWidth: 4,       // 边框宽度
      borderColor:"#fff",   // 边框颜色
      outerColor:"#fff",    // 最外层底圆颜色
      scheduleColor:"#fff", // 进度条动画颜色
      fontColor: "#52cc8f",    // 字体颜色
      ringColor: "#ccc", // 进度条环形颜色
      innerColor: "#fff",// 最内圆底色
      fontSize: 14,
      time: 10.5
    },
    showing:false,  //当前答题流程结束标记，判断当前题目是否结束，不接受延时消息
    houseId: '',
    clickFlag: false, // 当前题目答题标记，判断当前用户是否答题完毕，不接受再次答题
    wordsScore: [],  //结果页需要数据
    doWorkTime: 0,
    hisDoworkTime: 0,
    myRightAnswerNum: 0,
    hisRightAnswerNum: 0,
    myAnswersArr:[],  //作业情况
    myAnswer:{}, //当前题目做题状况
    hisAnswersArr: [],
    hisAnswer:{}
  },
  onLoad: function () {
    /**
     进入pk页，匹配对手ing，step-1
     匹配到对手后，准备流程 step-2
     匹配到对手之后，做题流程 step-3
     比赛结束，显示结果 step-4
     **/
    let that = this
    //建立web Socket
    wx.getStorage({
      key: 'userInfo',
      success: function (res) {
        that.setData({
          userInfo: res.data
        })
        that.connect()
      }
    })
    // that.ready()
    // that.gaming()
    // that.showResult()
  },
  setNextAnswer: function(flag){
    this.setData({
      isNextAnswer: flag
    })
  },
  setNextWord: function(flag){
    this.setData({
      isNextWord: flag
    })
  },
  setNextNum: function(flag){
    this.setData({
      isNextNum: flag
    })
  },
  //匹配流程中建立web Socket
  connect: function(){
    let waitTime = this.data.waitTime
    let socketOpen = false
    let that = this
    let timer = setInterval(()=>{
      waitTime--
      if(waitTime <= 0){
        that.sendSocketMessage(JSON.stringify({
          code: 3,
          houseId: that.data.houseId,
          userId: that.data.userInfo.userId
        }))
        clearInterval(timer)
      }
      that.setData({
        waitTime: waitTime
      })
    },1000)
    wx.connectSocket({
      url: ws,
      header:{
        'content-type': 'application/json'
      },
      protocols: ['protocol1'],
      method:"GET"
    })
    //连接打开
    wx.onSocketOpen(function(res) {
      that.setData({
        socketOpen: true
      })
      console.log('WebSocket连接已打开！')
      that.sendSocketMessage(JSON.stringify({
        code: 0,
        client: that.data.userInfo,
        msg: 'apply game'
      }))
      // clearInterval(timer)
    })
    //连接失败
    wx.onSocketError(function(res){
      socketOpen = false
      console.log('WebSocket连接打开失败，请检查！')
    })
    //监听服务端返回信息
    wx.onSocketMessage(function(res) {
      //各种逻辑
      let data = JSON.parse(res.data)
      switch(data.code)
      {
        case 0:
          //链接成功，等待对手加入
          that.setData({
            houseId: data.houseId
          })
          break;
        case 1:
          //这里知道匹配到对手了,进入准备阶段
          that.toGame(data)
          clearInterval(timer)
          break;
        case 2:
          // return false
          //做题流程中传输数据|| that.data.currentWordIndex != data.index
          that.handleAnswer(data)
          clearInterval(timer)
          break;
        case 3:
          break;
        default:
      }
    })
  },
  sendSocketMessage: function(msg){
    if (this.data.socketOpen) {
      wx.sendSocketMessage({
        data:msg
      })
    } else {
    }
  },
  toGame: function(data){
    let that = this
    data.resource.map((item)=>{
      item.state = ['','','','']
    })
    that.setData({
      wordsArr: data.resource
    })
    data.gamer.map((item)=>{
      if(that.data.userInfo.userId !== item.userId){
        //对手的
        that.setData({
          gamer: item
        })
      }
    })
    that.ready()
  },
  handleAnswer: function(data){
    let that = this
    if(that.data.showing || that.data.userInfo.userId === data.userId){
      return false
    }
    hisDoworkTime = data.answer.useTime
    if(data.answer.isRight === 1){
      that.setData({
        hisRightAnswerNum: that.data.hisRightAnswerNum + 1
      })
    }else if(data.answer.isRight === -1){
      //这是机器人，要本地来处理答案对错
      data.answer.isRight = false
      hisDoworkTime = Number((data.answer.useTime / 1000).toFixed(2))
      if(that.data.wordsArr[data.answer.index].answer === data.answer.chooseIndex){
        data.answer.isRight = true
        that.data.hisRightAnswerNum += 1
      }
    }
    that.data.hisAnswersArr.push(data.answer)
    that.setData({
      hisAnswer: data.answer,
      hisAnswersArr: that.data.hisAnswersArr,
      hisRightAnswerNum: that.data.hisRightAnswerNum
    })
    if(JSON.stringify(that.data.myAnswer) != "{}"){
      //代表我已经做答了，对方回答之后可以进入下一题
      clearInterval(that.data.canvasTimer);
      clearInterval(that.data.restoreTimer);
      that.showCorrectAnswer()
    }
  },
  //准备流程
  ready: function(){
    let that = this
    that.setData({
      step: 2
    })
    //同时设置不过渡
    setTimeout(()=>{
      that.setData({
        isMove: true
      })
    },200)
    // clearInterval(timer)
    setTimeout(()=>{
      that.setData({
        readyTime: 2
      })
      let readyTime = this.data.readyTime
      let timer = setInterval(()=>{
        readyTime--
        if(readyTime < 1){
          //匹配对手ing，匹配完成之后，进入做题流程
          clearInterval(timer)
          that.gaming()
        }
        that.setData({
          readyTime: readyTime
        })
      },1000)
    },1000)


  },
  //做题流程
  gaming: function(){
    let that = this
    that.setData({
      step: 3
    })
    let query = wx.createSelectorQuery();
    query.select('.canvas').boundingClientRect(function (rect) {
      that.data.settings.size = rect.width
      that.setData({
        settings: that.data.settings
      })
      that.doOneWorkIng()
      // that.doOneWord(0)
      setTimeout(()=>{
        that.initCanvas()
      },1500)
    }).exec()
  },
  doOneWorkIng: function(){
    let that = this
    that.showDom()
  },
  // 开始新的动画
  showDom: function(flag){
    let that = this
    let currentWordIndex = that.data.currentWordIndex
    console.log(doWorkTime,'我花了这么多时间，这是对手的时间',hisDoworkTime);
    if(currentWordIndex >= that.data.wordsArr.length - 1){
      clearInterval(doWorkTimer)
      that.setData({
        doWorkTime: doWorkTime.toFixed(2),
        hisDoworkTime: hisDoworkTime.toFixed(2) >= 50 ? 50 : hisDoworkTime.toFixed(2)
      })
      clearInterval(that.data.canvasTimer);
      clearInterval(that.data.restoreTimer);
      that.showResult()
      return false
    }
    if(flag){
      currentWordIndex++
      that.setData({
        currentWordIndex: currentWordIndex,
        titleNumber: currentWordIndex
      })
    }
    that.setNextNum(false)
    that.setNextAnswer(false)
    that.setNextWord(false)
    that.setNextNum(true)
    setTimeout(()=>{
      that.setNextAnswer(true)
      that.setNextWord(true)
      doWorkTimer = setInterval(()=>{
        doWorkTime += 0.01
      },10)
      setTimeout(()=>{
        that.setData({
          showing: false
        })
      },500)
    },1500)
  },
  // 隐藏dom，开启下一循环
  hideDom: function(){
    let that = this
    that.setNextNum(false)
    that.setNextAnswer(false)
    that.setNextWord(false)
    that.Restore()
  },
  // 当前答题完毕，显示双方答案和正确答案
  showCorrectAnswer: function(){
    let that = this
    that.setData({
      showing: true,
      clickFlag: false
    })
    let currentWordIndex = that.data.currentWordIndex
    let wordsArr = that.data.wordsArr
    let answer = wordsArr[currentWordIndex].answer
    wordsArr[currentWordIndex].state[answer] = 'correct'
    if(that.data.hisAnswer.chooseIndex === that.data.myAnswer.chooseIndex){
      //2个一样的答案
      if(that.data.hisAnswer.chooseIndex != -1){
        wordsArr[that.data.currentWordIndex].state[that.data.hisAnswer.chooseIndex] = that.data.hisAnswer.isRight ? 'right' : 'error'
      }
    }else{
      if(that.data.myAnswer.chooseIndex != -1){
        wordsArr[that.data.currentWordIndex].state[that.data.myAnswer.chooseIndex] = that.data.myAnswer.isRight ? 'myRight' : 'myError'
      }
      if(that.data.hisAnswer.chooseIndex != -1){
        wordsArr[that.data.currentWordIndex].state[that.data.hisAnswer.chooseIndex] = that.data.hisAnswer.isRight ? 'hisRight' : 'hisError'
      }
    }
    wordsArr[currentWordIndex].state = wordsArr[currentWordIndex].state.map((item)=>{
      if(item === ''){
        return 'hide'
      }else{
        return item
      }
    })
    that.setData({
      wordsArr: wordsArr
    })
    that.setData({
      myAnswer: {},
      hisAnswer: {}
    })
    setTimeout(()=>{
      that.hideDom()
    },1500)
  },
  //显示结果
  showResult: function(){
    let that = this
    let isWin = that.data.isWin
    that.setData({
      step: 4
    })
    this.sendSocketMessage(JSON.stringify({
      code: 2,
      houseId: that.data.houseId,
      userId: that.data.userInfo.userId,
    }))
    wx.closeSocket()
    wx.onSocketClose(function(res) {
      console.log('WebSocket 已关闭！')
    })
    doWorkTimer = {}
    doWorkTime = 0
    hisDoworkTime = 0
    clearInterval(that.data.canvasTimer);
    clearInterval(that.data.restoreTimer);
    let wordsScore = that.data.wordsScore
    that.data.wordsArr.map((item,index)=>{
      let myAnswersArr = that.data.myAnswersArr
      let hisAnswersArr = that.data.hisAnswersArr
      wordsScore[index] = {
        word:item.word,
        Interpretation: item.answerArr[item.answer],
        myState: myAnswersArr[index].isRight,
        hisState: hisAnswersArr[index].isRight
      }
    })
    if(that.data.myRightAnswerNum > that.data.hisRightAnswerNum){
      isWin = true
    }else if(that.data.myRightAnswerNum < that.data.hisRightAnswerNum){
      isWin = false
    }else if(that.data.myRightAnswerNum === that.data.hisRightAnswerNum) {
      isWin = Number(that.data.doWorkTime) > Number(that.data.hisDoworkTime) ? false : true
    }
    that.setData({
      wordsScore: wordsScore,
      isWin:isWin
    })
    let keyIsWin = isWin ? 1 : 0
    wx.request({
      url: hostObj.edit + "uid="+that.data.userInfo.userId+"&isWin=" + keyIsWin + '&clientId=' + clientId,
      method: 'POST',
      data:{
        isWin: keyIsWin,
        uid: that.data.userInfo.userId,
        clientId: clientId
      }
    })
  },
  //选择答案
  chooseThis: function(e){
    let that = this
    if(that.data.clickFlag || that.data.showing){
      return false
    }
    that.setData({
      clickFlag: true
    })
    let currentWordIndex = that.data.currentWordIndex
    let wordsArr = that.data.wordsArr
    let index = e.target.dataset.index * 1
    console.log(e.target.dataset.index,'indexindexindexindex');
    let data = {
      code: 1,
      // client: that.data.userInfo,
      msg:'send answer',
      houseId: that.data.houseId,
      userId: that.data.userInfo.userId,
      answer:{
        useTime: Number(doWorkTime.toFixed(2)),
        isRight: 1 ,
        chooseIndex: index,
        index: currentWordIndex
      }
    }
    clearInterval(doWorkTimer)
    if(index === wordsArr[currentWordIndex].answer){
      data.answer.isRight = 1
      that.data.myAnswersArr.push(data.answer)
      that.setData({
        myAnswer: data.answer,
        myAnswersArr: that.data.myAnswersArr
      })
      wordsArr[currentWordIndex].state[index] = 'myRight'
      this.sendSocketMessage(JSON.stringify(data))
      this.setData({
        myRightAnswerNum: this.data.myRightAnswerNum + 1
      })
    }else{
      data.answer.isRight = 0
      that.data.myAnswersArr.push(data.answer)
      that.setData({
        myAnswer: data.answer,
        myAnswersArr: that.data.myAnswersArr
      })
      wordsArr[currentWordIndex].state[index] = 'myError'
      this.sendSocketMessage(JSON.stringify(data))
    }
    if(JSON.stringify(that.data.hisAnswer) != "{}"){
      //代表我已经做答了，对方回答之后可以进入下一题
      clearInterval(that.data.canvasTimer);
      clearInterval(that.data.restoreTimer);
      that.showCorrectAnswer()
    }
    that.setData({
      wordsArr: wordsArr
    })
  },
  // canvas用到的方法
  initCanvas: function(opt){
    let that = this
    that.countdown()
  },
  // 进度条动画
  countdown: function () {
    let that = this
    let currentWordIndex = that.data.currentWordIndex
    let oldTime = +new Date();
    that.setData({
      canvasTimer: setInterval(() => {
        let allMs =  that.data.settings.time * 1000,// 如30*1000=30 000ms
            currentTime = +new Date();
        // 步长=（当前的时间-过去的时间）/总秒数
        let schedule = (currentTime - oldTime) / allMs;
        this.drawAll(schedule);
        if (currentTime - oldTime >= allMs) {
          // 恢复满状态
          clearInterval(that.data.canvasTimer);
          hisDoworkTime += 10
          clearInterval(doWorkTimer)

          let data = {
            useTime: doWorkTime.toFixed(2),
            isRight: 0 ,
            chooseIndex: -1
          }
          if(JSON.stringify(that.data.myAnswer) == "{}"){
            //当前题目为作答，当超时处理
            that.data.myAnswersArr.push(data)
            that.setData({
              myAnswer: data,
              myAnswersArr: that.data.myAnswersArr,
            })
          }
          if(JSON.stringify(that.data.hisAnswer) == "{}"){
            // data.chooseIndex = 3
            // data.useTime = that.data.hisAnswersArr[that.data.currentWordIndex - 1].useTime + 10
            that.data.hisAnswersArr.push(data)
            that.setData({
              hisAnswer: data,
              hisAnswersArr: that.data.hisAnswersArr,
            })
          }
          if(that.data.step !== 3){
            return false
          }
          that.showCorrectAnswer()
        }
      }, 60)
    })
  },
  // 绘制所有
  drawAll: function (schedule) {
    // console.log(schedule,'wwwwwwwwwwwwwww');
    schedule = schedule >= 1 ? 1 : schedule;
    let text = parseInt(this.data.time * (1 - schedule));
    // 清除画布
    // ctx.clearRect(0, 0, this.data.settings.size/2, this.data.settings.size/2);
    this.drawBackground();
    this.drawProcess();
    this.drawAnimate(schedule);
    this.drawInner();
    this.strokeText(text);
    ctx.draw()
  },
  //倒计时进度条恢复
  Restore:function(flag){
    let that = this
    that.showDom(true)
    let oldTime = +new Date();
    let num = 1
    that.setData({
      restoreTimer: setInterval(() => {
        let allMs =  num * 1000,
            currentTime = +new Date();
        let schedule = -(currentTime - oldTime) / allMs;
        ctx.clearRect(0, 0, that.data.settings.size/2, that.data.settings.size/2);
        that.drawBackground();
        that.drawProcess();
        if(flag){
          that.drawCircle(90,-270,3,'#52cc8f');
          console.log(flag)
        }
        that.restoreAnimation(schedule);
        that.drawInner();
        that.strokeText(10);
        ctx.draw()
        if (currentTime - oldTime >= allMs) {
          // 重绘
          clearInterval(that.data.restoreTimer);
          if(that.data.step !== 3){
            return false
          }
          that.countdown()
        }
      }, 50)
    })
  },
  //倒计时进度条恢复动画
  restoreAnimation: function (schedule) {
    // 旋转的角度
    let deg = Math.PI / 180;
    let v = schedule * 360,
        startAng = -90,
        endAng = -90 + v;
    let fillStyle = '#52cc8f';
    ctx.beginPath();
    ctx.moveTo(this.data.settings.size / 2, this.data.settings.size / 2);
    ctx.arc(this.data.settings.size / 2, this.data.settings.size / 2, this.data.settings.size / 2 -3, startAng * deg, endAng * deg, true);
    ctx.fillStyle = fillStyle;
    ctx.fill();
    ctx.closePath();
  },
  // 绘制圆
  drawCircle: function (startAng, endAng, border, fillColor) {
    let deg = Math.PI / 180;
    ctx.beginPath();
    ctx.arc(this.data.settings.size / 2,this.data.settings.size / 2, this.data.settings.size / 2 -border, startAng * deg, endAng * deg, false);
    ctx.fillStyle = fillColor;
    ctx.closePath();
    ctx.fill();
  },
  // 绘制文字
  strokeText: function (text) {
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = this.data.settings.fontSize+"px"+ " microsoft yahei";
    ctx.fillStyle = this.data.settings.fontColor;
    ctx.fillText(text, this.data.settings.size / 2, this.data.settings.size / 2);
  },
  // 绘制边框
  strokeBorder: function (borderWidth) {
    ctx.lineWidth = borderWidth;
    ctx.strokeStyle = this.data.settings.borderColor;
    ctx.stroke();
  },
  // 绘制进度条动画
  drawAnimate: function (schedule) {
    // 旋转的角度
    let deg = Math.PI / 180;
    let v = schedule * 360,
        startAng = -90,
        endAng = -90 + v;
    let fillStyle = '#52cc8f';
    if(v > 240){
      fillStyle = 'red'
    }
    if(v >= 360){
      fillStyle = '#ccc'
    }
    ctx.beginPath();
    ctx.moveTo(this.data.settings.size / 2, this.data.settings.size / 2);
    ctx.arc(this.data.settings.size / 2, this.data.settings.size / 2, this.data.settings.size / 2 -3, startAng * deg, endAng * deg, true);
    ctx.fillStyle = fillStyle;
    ctx.fill();
    ctx.closePath();
  },
  // 绘制倒计时
  drawInner: function () {
    this.drawCircle(0, 360, 8, this.data.settings.innerColor);
    this.strokeBorder(this.data.settings.borderWidth);
  },
  // 绘制进度条动画背景
  drawProcess: function () {
    this.drawCircle(0, 360, 4, this.data.settings.ringColor);
  },
  // 绘制底色
  drawBackground: function () {
    this.drawCircle(0, 360, 0, this.data.settings.outerColor);
  }
})