from flask import Flask, render_template

app = Flask(__name__)
app.config['JSON_AS_ASCII'] = False

# 新增：强制所有响应使用 UTF-8
@app.after_request
def set_response_encoding(response):
    response.headers['Content-Type'] = 'text/html; charset=utf-8'
    return response

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/story')
def story():
    return render_template('story.html')

@app.route('/free')
def free():
    return render_template('free.html')

@app.route('/navigate')
def navigate():
    return render_template('navigate.html')

if __name__ == '__main__':
    print("🚀 山城故事集 已启动")
    print("📍 访问地址: http://127.0.0.1:5000")
    app.run(debug=True, host='0.0.0.0', port=5000)