# 웹 게시 방법 (GitHub + Streamlit Community Cloud)

## 1. GitHub에 올리기
```bash
git init
git add .
git commit -m "LG 트윈스 직관 이동비용 앱"
git branch -M main
git remote add origin https://github.com/<내아이디>/<저장소이름>.git
git push -u origin main
```
(저장소는 github.com/new 에서 먼저 빈 저장소로 만든다. `node_modules`는 `.gitignore`로 제외된다.)

## 2. Streamlit Community Cloud에 배포
1. https://share.streamlit.io 에 GitHub 계정으로 로그인
2. **Create app** → **Deploy a public app from GitHub**
3. Repository: 위 저장소 / Branch: `main` / Main file path: `streamlit_app.py`
4. **Deploy** → 1~2분 뒤 `https://<앱이름>.streamlit.app` 주소 발급

## 로컬 확인
```bash
pip install -r requirements.txt
streamlit run streamlit_app.py
```

## 참고
- 앱 본체(`index.html`, `js/`, `css/`)는 그대로이고, `streamlit_app.py`가 이를 한 파일로 합쳐 보여준다. 수정 후 `git push`하면 자동 재배포된다.
- 경기 결과 수정값은 `localStorage`(방문자 브라우저)에 저장된다. Streamlit이 iframe으로 보여주므로 브라우저 설정에 따라 저장이 안 될 수 있으나 앱은 정상 동작한다.
- Streamlit 없이 더 간단히 게시하려면 GitHub Pages(Settings → Pages → `main` / root)도 가능하다. 이 폴더는 이미 정적 사이트라 추가 작업이 필요 없다.
