export default function(url,data,type,callBack){
  getStorage(function (url, token) {
    wx.request({
      url: url, //
      data: data,
      method: type,
      header: {
        'content-type': 'application/json',
        'token': token// 默认值
      },
      success: function (res) {
        if (res.statusCode != 200) {
          errcallback(2)
        } else {
          callBack(res.data)
        }
      },
      fail: function (res) {
        errcallback(3)
      }
    })
  })
}