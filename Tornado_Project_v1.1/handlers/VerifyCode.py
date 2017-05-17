# coding:utf-8

import logging
import constants
import random
import re

from .BaseHandler import BaseHandler
from utils.captcha.captcha import captcha
from utils.response_code import RET
from libs.yuntongxun.CCP import ccp

class ImageCodeHandler(BaseHandler):
    """"""
    def get(self):
        code_id = self.get_argument("codeid")
        pre_code_id = self.get_argument("pcodeid")
        if pre_code_id:
            try:
                self.redis.delete("image_code_%s" % pre_code_id)
            except Exception as e:
                logging.error(e)
        # name 图片验证码名称
        # text 图片验证码文本
        # image 图片验证码二进制数据
        name, text, image = captcha.generate_captcha()
        try:
            self.redis.setex("image_code_%s" % code_id, constants.IMAGE_CODE_EXPIRES_SECONDS, text)
        except Exception as e:
            logging.error(e)
            self.write("")
        else:
            self.set_header("Content-Type", "image/jpg")
            self.write(image)


class SMSCodeHandler(BaseHandler):
    """"""
    def post(self):
        # 获取参数
        mobile = self.json_args.get("mobile") 
        image_code_id = self.json_args.get("image_code_id") 
        image_code_text = self.json_args.get("image_code_text") 
        if not all((mobile, image_code_id, image_code_text)):
            return self.write(dict(errno=RET.PARAMERR, errmsg="参数不完整")) 
        if not re.match(r"1\d{10}", mobile):
            return self.write(dict(errno=RET.PARAMERR, errmsg="手机号错误")) 
        # 判断图片验证码
        try:
            real_image_code_text = self.redis.get("image_code_%s" % image_code_id)
        except Exception as e:
            logging.error(e)
            return self.write(dict(errno=RET.DBERR, errmsg="查询出错"))
        if not real_image_code_text:
            return self.write(dict(errno=RET.NODATA, errmsg="验证码已过期！"))
        if real_image_code_text.lower() != image_code_text.lower():
            return self.write(dict(errno=RET.DATAERR, errmsg="验证码错误！"))
        # 若成功：
        # 检查手机号是否存在
        try:
            res = self.db.get("select count(*) counts from ih_user_profile where up_mobile=%(mobile)s", mobile=mobile)
        except Exception as e:
            logging.error(e)
        else:
            if 0 != res['counts']:
                return self.write({"errno":RET.DATAEXIST, "errmsg":"该手机号已存在"})  
        # 生成随机验证码
        sms_code = "%04d" % random.randint(0, 9999)
        try:
            self.redis.setex("sms_code_%s" % mobile, constants.SMS_CODE_EXPIRES_SECONDS, sms_code)
        except Exception as e:
            logging.error(e)
            return self.write(dict(errno=RET.DBERR, errmsg="生成短信验证码错误"))
        # 发送短信
        try:
            ccp.sendTemplateSMS(mobile, [sms_code, constants.SMS_CODE_EXPIRES_SECONDS/60], 1)
            # 需要判断返回值，待实现
        except Exception as e:
            logging.error(e)
            return self.write(dict(errno=RET.THIRDERR, errmsg="发送失败！"))
        self.write(dict(errno=RET.OK, errmsg="OK"))