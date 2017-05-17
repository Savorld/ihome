function hrefBack() {
    history.go(-1);
}

function getCookie(name) {
    var r = document.cookie.match("\\b" + name + "=([^;]*)\\b");
    return r ? r[1] : undefined;
}

function decodeQuery(){
    var search = decodeURI(document.location.search);
    return search.replace(/(^\?)/, '').split('&').reduce(function(result, item){
        values = item.split('=');
        result[values[0]] = values[1];
        return result;
    }, {});
}

function showErrorMsg(msg) {
    $(".popup>p").html(msg);
    $('.popup_con').fadeIn('fast', function() {
        setTimeout(function(){
            $('.popup_con').fadeOut('fast',function(){}); 
        },1000) 
    });
}

$(document).ready(function(){
    $.get("/api/check_login", function(data) {
        if ("0" != data.errno) {
            location.href = "/login.html";
        }
    }, "json");
    $(".input-daterange").datepicker({
        format: "yyyy-mm-dd",
        startDate: "today",
        language: "zh-CN",
        autoclose: true
    });
    $(".input-daterange").on("changeDate", function(){
        var startDate = $("#start-date").val();
        var endDate = $("#end-date").val();

        if (startDate && endDate && startDate > endDate) {
            showErrorMsg("日期有误，请重新选择！");
        } else {
            var sd = new Date(startDate);
            var ed = new Date(endDate);
            days = (ed - sd)/(1000*3600*24) + 1;
            var price = $(".house-text>p>span").html();
            var amount = days * parseFloat(price);
            $(".order-amount>span").html(amount.toFixed(2) + "(共"+ days +"晚)");
        }
    });
    var queryData = decodeQuery();
    var houseId = queryData["hid"];
    $.get("/api/house/info?id=" + houseId, function(data){
        if ("0" == data.errno) {
            $(".house-info>img").attr("src", data.house.img_urls[0]);
            $(".house-text>h3").html(data.house.title);
            $(".house-text>p>span").html((data.house.price/100.0).toFixed(0));
        }
    });
    $(".submit-btn").on("click", function(e) {
        if ($(".order-amount>span").html()) {
            $(this).prop("disabled", true);
            var startDate = $("#start-date").val();
            var endDate = $("#end-date").val();
            var data = {
                "house_id":houseId,
                "start_date":startDate,
                "end_date":endDate
            };
            $.ajax({
                url:"/api/order",
                type:"POST",
                data: JSON.stringify(data), 
                contentType: "application/json",
                dataType: "json",
                headers:{
                    "X-XSRFTOKEN":getCookie("_xsrf"),
                },
                success: function (data) {
                    if ("4101" == data.errno) {
                        location.href = "/login.html";
                    } else if ("4004" == data.errno) {
                        showErrorMsg("房间已被抢定，请重新选择日期！"); 
                    } else if ("0" == data.errno) {
                        charge = data.charge;
                        pingpp.createPayment(charge, function(result, err){
                            console.log(result);
                            console.log(err.msg);
                            console.log(err.extra);
                            if (result == "success") {
                                // 只有微信公众账号 wx_pub 支付成功的结果会在这里返回，其他的支付结果都会跳转到 extra 中对应的 URL。
                            } else if (result == "fail") {
                                // charge 不正确或者微信公众账号支付失败时会在此处返回
                            } else if (result == "cancel") {
                                // 微信公众账号支付取消支付
                            }
                        });
                    }
                }
            });
        }
    });
})
