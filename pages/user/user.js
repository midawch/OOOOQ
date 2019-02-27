//user.js
import {host,hostObj,state} from "./../../config.js"
//获取应用实例
const app = getApp()
Page({
  data: {
    userInfo: {},
    canIUse: wx.canIUse('button.open-type.getUserInfo'),
    gameInfo: {},
    userId: 0
  },
  onLoad: function () {
    let that = this
    wx.getStorage({
      key: 'userInfo',
      success: function (res) {
        that.setData({
          userInfo: res.data,
          userId: res.data.userId
        })
        that.getGameInfo()
      }
    })
  },
  //获取对战信息
  getGameInfo: function(){
    let that = this
    wx.request({
      url: hostObj.record + "uid=" + that.data.userId,
      method: 'GET',
      success: (res)=>{
        if(res.data.data){
          let winP = ((res.data.data.win_times / res.data.data.times) * 100).toFixed(0) + '%'
          res.data.data.winP = winP
        }else{
          res.data.data = {
            times: 0,
            win_times: 0,
            winP: '0%'
          }
        }
        that.setData({
          gameInfo: res.data.data
        })
      }
    })
  },
  playGame: function(){
    wx.navigateTo({
      url: './../../pages/pk/pk'
    })
  }
})
