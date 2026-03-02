-- ============================================================
-- selling_goods 테이블
-- 상품 분석 시 이벤트 로그명 → 상품 정보 매핑용 기준 데이터
-- Supabase SQL Editor에서 실행하세요.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.selling_goods (
  id          BIGSERIAL PRIMARY KEY,
  log_name_a  TEXT        NOT NULL UNIQUE,  -- 이벤트 로그명 (매칭 키)
  index_a     TEXT,                          -- 상품 인덱스 A
  index_dev   TEXT,                          -- 상품 이름 (표시용)
  aos_id_a    TEXT,                          -- AOS 판매 ID
  ios_id_a    TEXT,                          -- iOS 판매 ID
  gem_price   INTEGER,                       -- 젬 가격
  aos_price   INTEGER,                       -- AOS 가격 (원)
  ios_price   INTEGER,                       -- iOS 가격 (원)
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스 (log_name_a 조회 성능)
CREATE INDEX IF NOT EXISTS idx_selling_goods_log_name_a
  ON public.selling_goods (log_name_a);

-- RLS: 인증된 사용자는 읽기 가능
ALTER TABLE public.selling_goods ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated users can read selling_goods"
  ON public.selling_goods
  FOR SELECT
  TO authenticated
  USING (true);
