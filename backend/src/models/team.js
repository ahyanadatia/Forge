// Team model (simplified for MVP)
module.exports = {
  id: Number,
  type: String, // 'hackathon' | 'startup'
  members: Array, // array of userIds
  eventId: Number,
  status: String, // 'forming' | 'active' | 'completed'
  createdAt: Date
};
