// app.js

// Kakao JavaScript SDK가 이미 index.html에서 불러와졌다고 가정합니다.

// Kakao SDK 초기화 (본인의 JavaScript 키로 교체)
Kakao.init('90ed090fa6d7044e65e276410a0232d7');
console.log("Kakao SDK initialized");

// toPlainObject 함수 (필요 시 사용)
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

// 가입하기 버튼 클릭 시 호출되는 함수
function loginWithKakao() {
  Kakao.Auth.login({
    scope: 'profile_nickname, account_email, gender, age_range, birthyear, phone_number',
    success: function(authObj) {
      console.log("Kakao login success:", authObj);
      // 로그인 성공 후 사용자 정보 요청
      Kakao.API.request({
        url: '/v2/user/me',
        success: function(res) {
          console.log("Kakao user info:", res);
          // 가입 완료 메시지 표시
          document.getElementById('signupResult').innerText = "가입이 완료되었습니다.";

          // 전체 데이터를 평면 객체로 변환해서 백엔드로 전송 (필요하다면)
          const userDataToSend = toPlainObject(res);
          console.log("전송할 데이터:", userDataToSend);

          fetch('/api/registerKakaoUser', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(userDataToSend)
          })
          .then(response => response.json())
          .then(data => {
            console.log("서버 응답:", data);
          })
          .catch(error => {
            console.error("사용자 정보 전송 오류:", error);
          });
        },
        fail: function(error) {
          console.error("Failed to get user info:", error);
        }
      });
    },
    fail: function(err) {
      console.error("Kakao login failed:", err);
    }
  });
}

// 자동 호출되는 Kakao.API.request 부분은 제거합니다.