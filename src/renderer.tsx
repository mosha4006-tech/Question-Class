import { jsxRenderer } from 'hono/jsx-renderer'

export const renderer = jsxRenderer(({ children }) => {
  return (
    <html lang="ko">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>깊이있는 질문 교실</title>
        
        {/* TailwindCSS */}
        <script src="https://cdn.tailwindcss.com"></script>
        
        {/* Font Awesome Icons */}
        <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet" />
        
        {/* Day.js for date handling */}
        <script src="https://cdn.jsdelivr.net/npm/dayjs@1.11.10/dayjs.min.js"></script>
        <script src="https://cdn.jsdelivr.net/npm/dayjs@1.11.10/plugin/relativeTime.js"></script>
        <script src="https://cdn.jsdelivr.net/npm/dayjs@1.11.10/locale/ko.js"></script>
        
        {/* Axios for HTTP requests */}
        <script src="https://cdn.jsdelivr.net/npm/axios@1.6.0/dist/axios.min.js"></script>
        
        {/* Custom styles */}
        <link href="/static/style.css" rel="stylesheet" />
        
        <script>
          {`
            // Day.js 설정
            dayjs.extend(dayjs_plugin_relativeTime);
            dayjs.locale('ko');
            
            // Tailwind 설정
            tailwind.config = {
              theme: {
                extend: {
                  colors: {
                    notion: {
                      50: '#f7f6f3',
                      100: '#f1f0ec',
                      200: '#e8e6e0',
                      300: '#ddd9d1',
                      400: '#cec8bc',
                      500: '#b8afa0',
                      600: '#9e9184',
                      700: '#84786c',
                      800: '#6d635a',
                      900: '#5a514a',
                    }
                  },
                  fontFamily: {
                    'notion': ['-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'sans-serif']
                  }
                }
              }
            }
          `}
        </script>
      </head>
      <body class="bg-notion-50 font-notion text-gray-900 min-h-screen">
        <div id="app">{children}</div>
        
        {/* Main JavaScript */}
        <script src="/static/app.js"></script>
      </body>
    </html>
  )
})
