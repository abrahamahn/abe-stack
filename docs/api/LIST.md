# Complete API Endpoints List

## Authentication & User Management

### Auth

1. `POST /auth/login` - Authenticate user and return tokens
2. `POST /auth/register` - Register a new user
3. `POST /auth/refresh` - Refresh access token
4. `POST /auth/logout` - Logout current user
5. `POST /auth/password-reset` - Request password reset
6. `POST /auth/reset-password/{token}` - Complete password reset
7. `POST /auth/verify-email` - Verify email address
8. `POST /auth/mfa/setup` - Set up MFA
9. `POST /auth/mfa/verify` - Verify and enable MFA
10. `POST /auth/mfa/disable` - Disable MFA
11. `POST /auth/verify-email/resend` - Resend email verification

### Sessions

12. `GET /sessions` - Get user's active sessions
13. `DELETE /sessions/{sessionId}` - Terminate a specific session
14. `DELETE /sessions/all` - Terminate all sessions except current one
15. `GET /auth/sessions` - Get all active sessions for current user

### Users

16. `GET /users` - Get users with filtering and pagination
17. `GET /users/me` - Get current user profile
18. `GET /users/{id}` - Get user by ID
19. `PUT /users/{id}` - Update user
20. `DELETE /users/{id}` - Delete user
21. `PUT /users/{id}/role` - Update user role
22. `PUT /users/{id}/password` - Update password
23. `GET /users/{id}/profile` - Get user profile
24. `PUT /users/{id}/profile` - Update profile information
25. `PUT /users/{id}/profile/image` - Update profile image
26. `GET /users/{id}/profile/completion` - Get profile completion status
27. `GET /users/search` - Search profiles
28. `GET /users/{userId}/stats` - Get user stats

### Preferences

29. `GET /users/{id}/preferences` - Get user preferences
30. `PUT /users/{id}/preferences` - Update user preferences
31. `PUT /users/{id}/preferences/notifications` - Update notification preferences
32. `PUT /users/{id}/preferences/privacy` - Update privacy preferences
33. `POST /users/{id}/preferences/reset` - Reset preferences to defaults

### Roles & Permissions

34. `GET /roles` - Get roles
35. `POST /roles` - Create role
36. `GET /roles/{id}` - Get role by ID
37. `PUT /roles/{id}` - Update role
38. `DELETE /roles/{id}` - Delete role
39. `GET /roles/{id}/permissions` - Get role permissions
40. `POST /roles/{id}/permissions` - Assign permission to role
41. `DELETE /roles/{id}/permissions/{permissionId}` - Remove permission from role
42. `GET /permissions` - Get permissions
43. `POST /permissions` - Create permission
44. `GET /permissions/{id}` - Get permission by ID
45. `PUT /permissions/{id}` - Update permission
46. `DELETE /permissions/{id}` - Delete permission

## Social Interactions

### Posts

47. `GET /posts` - Get posts with filters
48. `POST /posts` - Create post
49. `GET /posts/{id}` - Get post by ID
50. `PUT /posts/{id}` - Update post
51. `DELETE /posts/{id}` - Delete post
52. `GET /posts/status/{status}` - Get posts by status
53. `GET /posts/scheduled` - Get scheduled posts
54. `DELETE /posts/{id}/permanent` - Permanently delete post

### Comments

55. `GET /comments` - Get comments
56. `POST /comments` - Create comment
57. `GET /comments/{id}` - Get comment by ID
58. `PUT /comments/{id}` - Update comment
59. `DELETE /comments/{id}` - Delete comment
60. `GET /comments/{id}/replies` - Get replies to a comment
61. `GET /comments/{id}/thread` - Get comment thread
62. `GET /comments/{commentId}/likes` - Get users who liked a comment

### Likes

63. `POST /posts/{postId}/like` - Like a post
64. `DELETE /posts/{postId}/like` - Unlike a post
65. `GET /posts/{postId}/likes` - Get users who liked a post
66. `POST /comments/{commentId}/like` - Like a comment
67. `DELETE /comments/{commentId}/like` - Unlike a comment
68. `GET /likes` - Get likes
69. `POST /likes` - Create like
70. `GET /likes/{id}` - Get like by ID
71. `DELETE /likes/{id}` - Delete like
72. `POST /likes/toggle` - Toggle like status
73. `GET /likes/recent` - Get recent likes
74. `GET /likes/{entityType}/{entityId}` - Get likes for an entity

### Comments (Additional)

75. `GET /comments/{commentId}/likes` - Get likes for a comment
76. `POST /comments/{commentId}/likes` - Like a comment
77. `DELETE /comments/{commentId}/likes` - Unlike a comment
78. `POST /comments/{commentId}/likes/toggle` - Toggle like for a comment
79. `GET /posts/{postId}/comments` - Get comments for a post
80. `POST /posts/{postId}/comments` - Create a comment on a post

### Bookmarks

81. `GET /bookmarks` - Get user bookmarks
82. `POST /bookmarks` - Create bookmark
83. `GET /bookmarks/{id}` - Get bookmark by ID
84. `DELETE /bookmarks/{id}` - Delete bookmark
85. `PUT /bookmarks/{id}/notes` - Update bookmark notes
86. `PUT /bookmarks/{id}/collection` - Move bookmark to collection
87. `GET /bookmarks/check` - Check if user has bookmarked content
88. `POST /posts/{postId}/bookmark` - Bookmark a post
89. `DELETE /posts/{postId}/bookmark` - Remove bookmark from a post
90. `GET /users/{userId}/bookmarks` - Get user's bookmarks
91. `GET /bookmarks/by-collection/{collectionId}` - Get bookmarks in specific collection
92. `POST /bookmarks/move-batch` - Move multiple bookmarks to a collection

### Follows

93. `POST /follows` - Create follow relationship
94. `GET /follows/{id}` - Get follow by ID
95. `GET /follows/check` - Check if user is following another user
96. `POST /follows/toggle` - Toggle follow status
97. `GET /users/{id}/followers` - Get user's followers
98. `GET /users/{id}/following` - Get users followed by user
99. `GET /users/{id}/recent-followers` - Get user's recent followers
100.  `GET /users/{id}/recent-following` - Get users recently followed by user
101.  `GET /users/{id1}/mutual-followers/{id2}` - Get mutual followers between users
102.  `GET /follows/count` - Count followers or following
103.  `POST /follows/batch-count` - Batch count followers/following
104.  `POST /users/{userId}/follow` - Follow a user
105.  `DELETE /users/{userId}/follow` - Unfollow a user
106.  `GET /users/{userId}/followstats` - Get follow statistics
107.  `GET /users/{userId1}/mutual/{userId2}` - Get mutual followers
108.  `GET /follow/requests` - Get follow requests
109.  `PUT /follow/requests` - Update follow request

### Collections

110. `GET /collections` - Get user's collections
111. `POST /collections` - Create collection
112. `GET /collections/{id}` - Get collection by ID
113. `PUT /collections/{id}` - Update collection
114. `DELETE /collections/{id}` - Delete collection
115. `GET /collections/{id}/bookmarks` - Get bookmarks in collection

## Media Management

### Media

116. `POST /media` - Upload media
117. `GET /media` - Get media items
118. `GET /media/{id}` - Get media by ID
119. `PUT /media/{id}` - Update media
120. `DELETE /media/{id}` - Delete media
121. `POST /media/{id}/process` - Process media with custom options
122. `GET /media/{id}/status` - Get processing status
123. `GET /media/{id}/tags` - Get media tags
124. `POST /media/{id}/tags` - Add tags to media
125. `DELETE /media/{id}/tags` - Remove tags from media
126. `POST /media/{mediaId}/generate-variants` - Generate additional media variants
127. `GET /media/{mediaId}/variants` - Get media variants
128. `DELETE /media/{mediaId}/variants/{variantId}` - Delete a specific media variant

### Media Collections

129. `GET /media/collections` - Get media collections
130. `POST /media/collections` - Create a new media collection
131. `GET /media/collections/{collectionId}` - Get a specific media collection
132. `PUT /media/collections/{collectionId}` - Update a media collection
133. `DELETE /media/collections/{collectionId}` - Delete a media collection
134. `POST /media/collections/{collectionId}/items` - Add media to collection
135. `GET /media/collections/{collectionId}/items` - Get media items in collection
136. `POST /collections/{id}/media` - Add media to collection
137. `DELETE /collections/{id}/media` - Remove media from collection
138. `POST /collections/{id}/share` - Share collection with users

## Groups & Communities

### Groups

139. `GET /groups` - Get groups
140. `POST /groups` - Create group
141. `GET /groups/{id}` - Get group by ID
142. `PUT /groups/{id}` - Update group
143. `DELETE /groups/{id}` - Delete group
144. `POST /groups/{id}/join` - Join group
145. `POST /groups/{id}/leave` - Leave group
146. `GET /groups/{id}/members` - Get group members
147. `POST /groups/{id}/members` - Add member to group
148. `DELETE /groups/{id}/members` - Remove member from group
149. `PUT /groups/{id}/members/{userId}` - Update group member role/status
150. `DELETE /groups/{id}/members/{userId}` - Remove member from group
151. `POST /groups/{id}/invitations` - Invite user to group
152. `PUT /groups/{id}/invitations/{userId}` - Respond to group invitation
153. `GET /groups/{id}/posts` - Get posts in a group
154. `POST /groups/{id}/posts` - Create a post in a group

## Messaging

### Conversations

155. `POST /conversations` - Create conversation
156. `GET /conversations` - Get conversations
157. `GET /conversations/{id}` - Get conversation by ID
158. `PUT /conversations/{id}` - Update conversation
159. `POST /conversations/{id}/participants` - Add participants
160. `DELETE /conversations/{id}/participants` - Remove participants
161. `POST /conversations/{id}/leave` - Leave conversation
162. `GET /conversations/{id}/typing` - Get users currently typing in conversation
163. `POST /conversations/{id}/typing` - Send typing indicator
164. `GET /conversations/{id}/members` - Get members of a conversation
165. `PUT /conversations/{id}/settings` - Update conversation settings

### Messages

166. `POST /messages` - Create message
167. `GET /messages/{id}` - Get message by ID
168. `PUT /messages/{id}` - Update message
169. `DELETE /messages/{id}` - Delete message
170. `DELETE /messages/{id}/all` - Delete message for all users
171. `POST /messages/{id}/reaction` - Add reaction
172. `DELETE /messages/{id}/reaction` - Remove reaction
173. `POST /messages/{id}/read` - Mark message as read
174. `POST /messages/read/batch` - Mark multiple messages as read
175. `POST /conversations/{id}/read` - Mark conversation as read
176. `GET /messages/{id}/edit-history` - Get edit history
177. `GET /messages/{id}/delivery-status` - Get delivery status
178. `GET /messages/search` - Search messages
179. `POST /conversations/{id}/messages` - Send a message
180. `GET /conversations/{id}/messages` - Get messages in a conversation

## Notifications

### Notifications

181. `GET /notifications` - Get notifications
182. `GET /notifications/unread-count` - Get unread notification count
183. `GET /notifications/{id}` - Get notification by ID
184. `DELETE /notifications/{id}` - Delete notification
185. `POST /notifications/{id}/read` - Mark notification as read
186. `POST /notifications/read-all` - Mark all notifications as read
187. `POST /notifications/delete-all` - Delete all notifications
188. `GET /notifications/preferences` - Get notification preferences
189. `PUT /notifications/preferences` - Update notification preferences
190. `POST /notifications/batch-count-unread` - Batch count unread notifications
191. `GET /notifications/recent` - Find recent notifications by type
192. `GET /notifications/oldest` - Find oldest notifications
193. `GET /notifications/date-range` - Find notifications in date range
194. `DELETE /notifications/entity/{entityId}` - Delete by entity ID and type
195. `POST /notifications/read` - Mark notifications as read
196. `POST /notifications/read/all` - Mark all notifications as read
197. `GET /notifications/count` - Get count of unread notifications
198. `POST /notifications/disable/{type}` - Disable specific notification type
199. `POST /notifications/enable/{type}` - Enable specific notification type

## Discoveries & Recommendations

### Search

200. `GET /search` - Global search across multiple entity types
201. `GET /search/recent` - Get recent content
202. `GET /search/tags/{tag}` - Search by tag
203. `GET /search/suggestions` - Get search suggestions based on prefix
204. `GET /search/popular` - Get popular searches
205. `GET /search/users` - Search specifically for users
206. `GET /search/posts` - Search specifically for posts
207. `GET /search/groups` - Search specifically for groups
208. `GET /search/media` - Search specifically for media
209. `GET /search/hashtags` - Search specifically for hashtags

### Recommendations

210. `GET /recommendations/users` - Get recommended users
211. `GET /recommendations/groups` - Get recommended groups
212. `GET /recommendations/content` - Get recommended content
213. `GET /trending` - Get trending content

### Hashtags

214. `GET /hashtags` - Search hashtags by prefix
215. `GET /hashtags/trending` - Get trending hashtags
216. `GET /hashtags/{tag}` - Get hashtag details
217. `GET /hashtags/{tag}/stats` - Get hashtag statistics
218. `GET /hashtags/{tag}/related` - Get related hashtags
219. `GET /hashtags/{tag}/posts` - Get posts with hashtag
220. `GET /hashtags/{tag}/top-users` - Get top users for hashtag
221. `GET /hashtags/{tag}/hourly-usage` - Get hourly usage statistics
222. `GET /hashtags/{tag}/daily-usage` - Get daily usage statistics
223. `POST /hashtags/batch-stats` - Get statistics for multiple hashtags
224. `GET /tags/trending` - Get trending tags
225. `GET /media/search/tags` - Search media by tags

### Feeds

226. `GET /feed/home` - Get personalized home feed
227. `GET /feed/explore` - Get discovery feed with trending content
228. `GET /feed/hashtag/{tag}` - Get posts with a specific hashtag
229. `GET /feed/profile/{userId}` - Get posts for a user profile
230. `GET /feed/saved` - Get bookmarked posts for current user

## Moderation & Reporting

### Moderation

231. `GET /reports` - Get content reports
232. `POST /reports` - Create content report
233. `GET /reports/{id}` - Get report by ID
234. `PUT /reports/{id}` - Update report
235. `POST /reports/{id}/resolve` - Resolve report
236. `POST /reports/{id}/dismiss` - Dismiss report
237. `POST /reports/{id}/assign` - Assign report to reviewer
238. `POST /reports/{id}/evidence` - Add evidence to report
239. `GET /reports/statistics` - Get report statistics
240. `GET /reports/by-user/{userId}` - Get reports submitted by a user
241. `GET /reports/against-user/{userId}` - Get reports against a user

### Moderation Actions

242. `GET /moderation/actions` - Get moderation actions
243. `POST /moderation/actions` - Create moderation action
244. `GET /moderation/actions/{id}` - Get moderation action by ID
245. `PUT /moderation/actions/{id}` - Update moderation action
246. `DELETE /moderation/actions/{id}` - Delete moderation action
247. `POST /moderation/actions/{id}/apply` - Apply moderation action
248. `POST /moderation/actions/{id}/reverse` - Reverse moderation action
249. `POST /moderation/actions/{id}/expire` - Expire temporary action
250. `PUT /moderation/actions/{id}/extend` - Extend temporary action expiration
251. `GET /moderation/actions/counts-by-type` - Get count of actions by type
252. `GET /moderation/actions/active` - Get active moderation actions
253. `GET /moderation/actions/expired` - Get expired moderation actions
254. `POST /moderation/report` - Report inappropriate content
255. `POST /moderation/appeal` - Submit appeal for moderation action
256. `POST /moderation/content/analyze` - Analyze content for policy violations
257. `GET /moderation/auto-moderation/settings` - Get auto-moderation settings
258. `PUT /moderation/auto-moderation/settings` - Update auto-moderation settings
259. `POST /moderation/actions/{id}/review` - Review a moderation action

## System & Analytics

### Health & System

260. `GET /health` - System health check
261. `GET /metrics` - System metrics
262. `GET /health/detailed` - Get detailed health information
263. `GET /rate-limits` - Get current rate limit information
264. `GET /system/version` - Get system version information

### Analytics

265. `GET /analytics/user/{userId}` - Get user analytics
266. `GET /analytics/post/{postId}` - Get post analytics
267. `GET /analytics/group/{groupId}` - Get group analytics
268. `GET /analytics/activity` - Get activity log
269. `GET /analytics/trends` - Analyze trends for a specific metric
270. `POST /analytics/reports/custom` - Generate custom report
271. `GET /analytics/system/compliance` - Get compliance report
272. `GET /analytics/user/patterns` - Get user activity patterns
273. `GET /analytics/content/performance` - Get content performance metrics
274. `GET /analytics/engagement` - Get user engagement metrics
275. `GET /analytics/growth` - Get platform growth metrics
276. `GET /analytics/media/{mediaId}` - Get media analytics
277. `GET /analytics/hashtag/{hashtag}` - Get hashtag analytics
278. `GET /analytics/user-retention` - Get user retention metrics
279. `GET /analytics/content-engagement` - Get content engagement metrics

### Geolocation

280. `GET /geo/location` - Get location by IP
281. `GET /geo/coordinates` - Get location from coordinates
282. `GET /geo/distance` - Calculate distance between two coordinates

### Presence

283. `POST /presence` - Update user's presence status
284. `GET /presence/{userId}` - Get user's presence information
285. `POST /presence/users` - Get presence for multiple users
286. `GET /presence/context/{contextId}` - Get users in a context
287. `POST /presence/join/{contextId}` - Track user joining a context
288. `POST /presence/leave/{contextId}` - Track user leaving a context
289. `POST /presence/activity` - Track user activity

### Jobs & Background Processing

290. `POST /jobs` - Create background job
291. `GET /jobs` - Get list of jobs
292. `GET /jobs/{jobId}` - Get specific job
293. `DELETE /jobs/{jobId}` - Cancel job
294. `POST /onboarding` - Start onboarding workflow
295. `GET /onboarding/{userId}/status` - Get onboarding status
296. `GET /categories` - Get a list of content categories
