"""Streamlit Community Cloud 진입점.

앱 본체는 순수 HTML/CSS/JS(index.html)이므로 CSS·JS를 index.html에 인라인으로
합쳐서 st.components.v1.html로 그대로 보여준다. 앱 로직은 바꾸지 않는다.
"""
import re
from pathlib import Path

import streamlit as st
import streamlit.components.v1 as components

ROOT = Path(__file__).parent

st.set_page_config(page_title="LG 트윈스 직관 이동비용", page_icon="⚾", layout="wide")

# Streamlit 기본 여백·머리글을 줄여 앱이 화면을 꽉 채우게 한다.
st.markdown(
    """
    <style>
      header[data-testid="stHeader"], footer {display: none;}
      .block-container {padding: 0 !important; max-width: 100% !important;}
    </style>
    """,
    unsafe_allow_html=True,
)


@st.cache_data
def build_html() -> str:
    html = (ROOT / "index.html").read_text(encoding="utf-8")

    def read(rel: str) -> str:
        return (ROOT / rel).read_text(encoding="utf-8")

    html = re.sub(
        r'<link rel="stylesheet" href="([^"]+)">',
        lambda m: f"<style>\n{read(m.group(1))}\n</style>",
        html,
    )
    html = re.sub(
        r'<script src="([^"]+)"></script>',
        lambda m: f"<script>\n{read(m.group(1))}\n</script>",
        html,
    )
    return html


components.html(build_html(), height=2600, scrolling=True)
