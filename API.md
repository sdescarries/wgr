# API Reverse-Engineering

## POST Request

```HTTP
POST /GuestReg.aspx?gymid=10 HTTP/2
Host: ggpx.info
Content-Length: 4551
Cache-Control: max-age=0
Sec-Ch-Ua: "Chromium";v="111", "Not(A:Brand";v="8"
Sec-Ch-Ua-Mobile: ?0
Sec-Ch-Ua-Platform: "Linux"
Upgrade-Insecure-Requests: 1
Origin: https://ggpx.info
Content-Type: application/x-www-form-urlencoded
User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/111.0.5563.65 Safari/537.36
Accept: text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7
Sec-Fetch-Site: same-origin
Sec-Fetch-Mode: navigate
Sec-Fetch-User: ?1
Sec-Fetch-Dest: document
Referer: https://ggpx.info/GuestReg.aspx?gymid=10
Accept-Encoding: gzip, deflate
Accept-Language: en-US,en;q=0.9

__VIEWSTATE=...&__VIEWSTATEGENERATOR=...&__EVENTVALIDATION=...&RegCode=XXXXXX&Email=robert.binette%40mail.co&FirstName=Robert&LastName=Binette&YearOfBirth=1974&GenderM=on&StreetAddress=832+des+Tulippes&Appartment=3&City=Sherbrooke&StateProv=Qc&PostalCode=J1J+6L9&PhoneMobile=999-123-4567&GuestPassType=GVM&PromoCode=VIP01234&GuestServicesAgreement1=on&GuestServicesAgreement2=on&GuestServicesAgreement3=on&Agreement=on&btnSubmit=Suivant

```

### Response

```HTTP
HTTP/2 302 Found
Cache-Control: private
Content-Type: text/html; charset=utf-8
Location: /GuestRegConfirm.aspx
Server: Microsoft-IIS/10.0
Set-Cookie: ASP.NET_SessionId=nx3q0c4dgu3s30unpuom41ql; path=/; HttpOnly; SameSite=Lax
X-Aspnet-Version: 4.0.30319
X-Powered-By: ASP.NET
X-Powered-By-Plesk: PleskWin
Date: Tue, 21 Mar 2023 00:16:36 GMT
Content-Length: 138

<html><head><title>Object moved</title></head><body>
<h2>Object moved to <a href="/GuestRegConfirm.aspx">here</a>.</h2>
</body></html>
```

### Get Token

```HTTP
GET /GuestRegConfirm.aspx HTTP/2
Host: ggpx.info
Cookie: ASP.NET_SessionId=nx3q0c4dgu3s30unpuom41ql
Cache-Control: max-age=0
Upgrade-Insecure-Requests: 1
User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/111.0.5563.65 Safari/537.36
Accept: text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7
Sec-Fetch-Site: same-origin
Sec-Fetch-Mode: navigate
Sec-Fetch-User: ?1
Sec-Fetch-Dest: document
Sec-Ch-Ua: "Chromium";v="111", "Not(A:Brand";v="8"
Sec-Ch-Ua-Mobile: ?0
Sec-Ch-Ua-Platform: "Linux"
Referer: https://ggpx.info/GuestReg.aspx?gymid=10
Accept-Encoding: gzip, deflate
Accept-Language: en-US,en;q=0.9
```

### Resposne

```HTTP
HTTP/2 200 OK
Cache-Control: private
Content-Type: text/html; charset=utf-8
Vary: Accept-Encoding
Server: Microsoft-IIS/10.0
X-Aspnet-Version: 4.0.30319
X-Powered-By: ASP.NET
X-Powered-By-Plesk: PleskWin
Date: Tue, 21 Mar 2023 00:16:55 GMT
Content-Length: 3166
```

```HTML
<span id="lblConfirmationNum" class="text_48pts_center_red">000-000</span>
```
