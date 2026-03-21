{/* 기존 로딩 화면 부분 수정 */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-32 animate-in fade-in">
            <Loader2 className="animate-spin text-blue-600 mb-6" size={56} />
            <h3 className="text-xl font-bold text-slate-800 mb-2">실시간 데이터 심층 분석 중...</h3>
            
            {/* 💡 대기 시간이 길어짐을 안내하는 문구 추가 */}
            <p className="text-slate-500 mb-4 text-sm font-medium">
              유료 AI 모델을 통한 상세 분석으로 <span className="text-blue-600">약 15~30초</span> 정도 소요될 수 있습니다.
            </p>

            {compareProgress && <p className="text-blue-600 font-semibold text-sm mb-2 bg-blue-50 px-4 py-2 rounded-full border border-blue-100 shadow-sm animate-in fade-in">🔄 {compareProgress}</p>}
            {statusMessage && <p className="text-emerald-600 font-semibold text-sm mb-2 bg-emerald-50 px-4 py-2 rounded-full border border-emerald-100 shadow-sm animate-in fade-in">✨ {statusMessage}</p>}
          </div>
        )}