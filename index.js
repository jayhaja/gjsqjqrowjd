// 환경 변수 로드 (최상단에 배치)
require('dotenv').config();

const express = require('express');
const axios = require('axios');
const mongoose = require('mongoose');
const app = express();
const PORT = process.env.PORT || 3000;

// JSON 파싱 미들웨어 (POST 요청 시 body를 파싱)
app.use(express.json());

// 정적 파일 제공: public 폴더를 정적 경로로 사용 (public/index.html이 기본 페이지로 제공됨)
app.use(express.static('public', {
  setHeaders: function (res, path) {
    if (path.endsWith('.html')) {
      res.setHeader('Content-Type', 'text/html');
    }
  }
}));

// 로그인 페이지 라우트 (정적 파일 대신 별도의 HTML 제공 예시)
app.get('/login', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="ko">
      <head>
        <meta charset="UTF-8">
        <title>카카오톡 로그인</title>
      </head>
      <body>
        <h1>로그인 페이지</h1>
        <a href="/auth/kakao">카카오톡으로 로그인하기</a>
      </body>
    </html>
  `);
});

// 카카오 인증 요청 라우트: 카카오 인증 서버로 리디렉션
app.get('/auth/kakao', (req, res) => {
  const client_id = process.env.KAKAO_CLIENT_ID;
  const redirect_uri = process.env.KAKAO_REDIRECT_URI;
  const kakaoAuthURL = `https://kauth.kakao.com/oauth/authorize?client_id=${client_id}&redirect_uri=${redirect_uri}&response_type=code`;
  res.redirect(kakaoAuthURL);
});

// 카카오 인증 콜백 라우트: 카카오에서 전달한 인가 코드를 처리하고 사용자 정보를 가져옵니다.
app.get('/auth/kakao/callback', async (req, res) => {
  const { code } = req.query; // 카카오에서 전달한 인가 코드
  try {
    // 인가 코드를 액세스 토큰으로 교환하는 요청
    const tokenResponse = await axios({
      method: 'POST',
      url: 'https://kauth.kakao.com/oauth/token',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      params: {
        grant_type: 'authorization_code',
        client_id: process.env.KAKAO_CLIENT_ID,
        redirect_uri: process.env.KAKAO_REDIRECT_URI,
        code: code
      }
    });
    const access_token = tokenResponse.data.access_token;
    console.log('Access Token:', access_token);

    // 액세스 토큰을 이용해 사용자 정보 요청
    const userResponse = await axios({
      method: 'GET',
      url: 'https://kapi.kakao.com/v2/user/me',
      headers: { Authorization: `Bearer ${access_token}` }
    });
    const userData = userResponse.data;
    console.log('카카오 사용자 정보:', userData);

    // 실제 운영 시에는 사용자 정보를 DB에 저장하고 적절한 페이지로 리디렉션합니다.
    res.send(`로그인 성공! 사용자 정보: ${JSON.stringify(userData)}`);
  } catch (error) {
    console.error('카카오 로그인 오류:', error);
    res.status(500).send('카카오 로그인 중 오류가 발생했습니다.');
  }
});

// MongoDB 연결
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/kakaoUsers', {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => {
  console.log("MongoDB 연결 성공");
})
.catch(err => {
  console.error("MongoDB 연결 오류:", err);
});

// 사용자 스키마 정의 (카카오 로그인으로 받은 정보를 저장)
const userSchema = new mongoose.Schema({
  id: { type: String, unique: true },
  profile_nickname: String,
  account_email: String,
  gender: String,
  age_range: String,
  birthyear: String,
  phone_number: String,
  createdAt: { type: Date, default: Date.now }
});

// 스키마로 모델 생성
const User = mongoose.model('User', userSchema);

/* 
  toPlainObject 함수: Kakao API 응답 객체의 모든 own property(열거 가능한 & non-enumerable)들을 포함하는 평면 객체로 변환
*/
function toPlainObject(obj) {
  if (obj === null || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) {
    return obj.map(item => toPlainObject(item));
  }
  const plain = {};
  Object.getOwnPropertyNames(obj).forEach(key => {
    plain[key] = toPlainObject(obj[key]);
  });
  return plain;
}

// API 엔드포인트: 프론트엔드에서 전달받은 사용자 정보를 MongoDB에 저장
app.post('/api/registerKakaoUser', async (req, res) => {
  console.log("POST /api/registerKakaoUser 호출됨");
  console.log("요청 데이터:", req.body);
  
  try {
    // 기존 사용자가 있는지 확인
    let user = await User.findOne({ id: req.body.id });
    if (!user) {
      // 신규 사용자 생성
      user = new User({
        id: req.body.id,
        profile_nickname: req.body.properties ? req.body.properties.nickname : '',
        account_email: req.body.kakao_account ? req.body.kakao_account.email : '',
        gender: req.body.kakao_account ? req.body.kakao_account.gender : '',
        age_range: req.body.kakao_account ? req.body.kakao_account.age_range : '',
        birthyear: req.body.kakao_account ? req.body.kakao_account.birthyear : '',
        phone_number: req.body.kakao_account ? req.body.kakao_account.phone_number : ''
      });
      await user.save();
      console.log("사용자 정보 저장 완료:", user);
    } else {
      console.log("기존 사용자 발견:", user);
    }
    res.json({ success: true, message: "회원가입이 완료되었습니다." });
  } catch (error) {
    console.error("데이터베이스 저장 오류:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 테스트 라우트 (index.html을 직접 보내는 용도)
app.get('/test-html', (req, res) => {
  res.sendFile(__dirname + '/public/index.html');
});

// 서버 실행 (한 번만 호출)
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});