import { featureRequestCommentAuthor, featureRequestStatusLabel, normalizeFeatureRequest, normalizeFeatureRequestComment } from '../featureRequestModel';
describe('featureRequestModel', () => {
  test('normalizes request fields and status labels', () => { expect(normalizeFeatureRequest({ id: 1, title: '요청', status: 'reviewed', created_at: '2026-01-01', comment_count: 2 })).toMatchObject({ id: 1, status: 'reviewed', commentCount: 2 }); expect(featureRequestStatusLabel('done')).toBe('완료'); });
  test('uses safe comment author fallbacks', () => { const comment = normalizeFeatureRequestComment({ id: 2, author_role: 'admin', author_display_name: '담당자', content: '확인' })!; expect(featureRequestCommentAuthor(comment)).toBe('담당자'); });
});
