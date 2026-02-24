// Mock data for creator dashboard
export const mockArrangements = [
  {
    id: 1,
    title: "Amazing Grace",
    artist: "Traditional",
    type: "premium" as const,
    price: "Rp5.000",
    views: 1234,
    downloads: 89,
    earnings: "Rp312.500",
    status: "published" as const,
    createdAt: "2024-01-15"
  },
  {
    id: 2,
    title: "How Great Thou Art", 
    artist: "Carl Boberg",
    type: "free" as const,
    price: "Free",
    views: 2456,
    downloads: 234,
    earnings: "Rp0",
    status: "published" as const,
    createdAt: "2024-01-10"
  },
  {
    id: 3,
    title: "Oceans (Where Feet May Fail)",
    artist: "Hillsong United",
    type: "premium" as const,
    price: "Rp7.500",
    views: 987,
    downloads: 56,
    earnings: "Rp294.000",
    status: "draft" as const,
    createdAt: "2024-01-20"
  }
];

export const mockStats = {
  totalEarnings: "Rp1.245.000",
  totalViews: 4677,
  totalDownloads: 379,
  followers: 156,
  salesThisMonth: 28
};

export const mockBundles = [
  {
    id: 1,
    title: "Christmas Worship Pack",
    description: "A collection of beautiful Christmas arrangements for your worship service",
    price: "Rp35.000",
    songs: ["Silent Night", "O Holy Night", "Joy to the World", "Hark! The Herald Angels Sing"],
    sales: 15,
    revenue: "Rp525.000",
    status: "published" as const
  },
  {
    id: 2,
    title: "Easter Collection",
    description: "Powerful Easter songs to celebrate the resurrection",
    price: "Rp25.000",
    songs: ["Because He Lives", "Christ the Lord Is Risen Today", "In Christ Alone"],
    sales: 8,
    revenue: "Rp200.000",
    status: "draft" as const
  }
];

export const mockEarnings = {
  totalEarnings: "Rp1.245.000",
  pendingWithdrawal: "Rp485.000",
  thisMonth: "Rp380.000",
  lastWithdrawal: "Rp760.000 on Jan 15, 2024"
};

export const mockArrangementEarnings = [
  {
    id: 1,
    title: "Amazing Grace",
    sales: 62,
    revenue: "Rp310.000",
    platformFee: "Rp93.000",
    netEarnings: "Rp217.000"
  },
  {
    id: 2,
    title: "Oceans (Where Feet May Fail)",
    sales: 38,
    revenue: "Rp285.000",
    platformFee: "Rp85.500",
    netEarnings: "Rp199.500"
  }
];

export const mockCreatorProfile = {
  name: "Arrangely",
  username: "johndoe-worship",
  bio: "Worship leader and arranger passionate about creating beautiful music for the church. Serving at Grace Community Church since 2020.",
  followers: 156,
  totalArrangements: mockArrangements.length,
  topCreator: true,
  profileImage: "https://api.dicebear.com/7.x/avataaars/svg?seed=creator",
  socialLinks: {
    instagram: "@johndoeworship",
    youtube: "Arrangely Worship",
    facebook: ""
  }
};