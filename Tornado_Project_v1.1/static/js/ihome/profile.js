function showSuccessMsg() {
    $('.save_success').fadeIn('fast', function() {
        setTimeout(function(){
            $('.save_success').fadeOut('fast',function(){}); 
        },1000) 
    });
}

function getCookie(name) {
    var r = document.cookie.match("\\b" + name + "=([^;]*)\\b");
    return r ? r[1] : undefined;
}

$(document).ready(function(){
    $.get("/api/profile", function(data){
        if ("4101" == data.errno) {
            location.href = "/login.html";
        }
        else if ("0" == data.errno) {
            $("#user-name").val(data.data.name);
            if (data.data.avatar) {
                $("#user-avatar").attr("src", data.data.avatar);
            }
        }
    })
    //上传头像
    $("#form-avatar").submit(function(e){
        e.preventDefault();
        $('.image_uploading').fadeIn('fast');
        var options = {
            url:"/api/profile/avatar",
            type:"POST",
            headers:{
                "X-XSRFTOKEN":getCookie("_xsrf"),
            },
            success: function(data){
                if ("0" == data.errno) {
                    $('.image_uploading').fadeOut('fast');
                    $("#user-avatar").attr("src", data.url);
                } else if ("4101" == data.errno) {
                    location.href = "/login.html";
                }
            }
        };
        $(this).ajaxSubmit(options);
    });
    $("#form-name").submit(function(e){
        e.preventDefault();
        var data = {};
        $(this).serializeArray().map(function(x){data[x.name] = x.value;}); 
        var jsonData = JSON.stringify(data);
        $.ajax({
            url:"/api/profile/name",
            type:"POST",
            data: jsonData, 
            contentType: "application/json",
            dataType: "json",
            headers:{
                "X-XSRFTOKEN":getCookie("_xsrf"),
            },
            success: function (data) {
                if ("0" == data.errno) {
                    $(".error-msg").hide();
                    showSuccessMsg();
                } else if ("4001" == data.errno) {
                    $(".error-msg").show();
                }
            }
        });
    })
})