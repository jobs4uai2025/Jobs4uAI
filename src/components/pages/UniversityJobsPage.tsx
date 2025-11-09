import { useState, useEffect } from "react";
import { GraduationCap, ExternalLink, Search, Loader2, MapPin, Clock, Building2 } from "lucide-react";
import { Button } from "../ui/button";
import { Card, CardContent } from "../ui/card";
import { Badge } from "../ui/badge";
import { Input } from "../ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { jobService, Job } from "../../services/jobService";
import { toast } from "sonner";

export function UniversityJobsPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ total: 0, handshake: 0, linkedin: 0, other: 0 });
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    pages: 0
  });

  // Filters
  const [searchKeywords, setSearchKeywords] = useState("");
  const [location, setLocation] = useState("");
  const [employmentType, setEmploymentType] = useState("");

  // Fetch university jobs
  const fetchUniversityJobs = async (page = 1) => {
    try {
      setLoading(true);
      const response = await jobService.getUniversityJobs({
        page,
        limit: 20,
        keywords: searchKeywords || undefined,
        location: location || undefined,
        employmentType: employmentType || undefined,
      });

      setJobs(response.jobs);
      setStats(response.stats);
      setPagination(response.pagination);
    } catch (error) {
      console.error('Error fetching university jobs:', error);
      toast.error('Failed to load university jobs');
    } finally {
      setLoading(false);
    }
  };

  // Initial load
  useEffect(() => {
    fetchUniversityJobs(1);
  }, []);

  // Apply filters
  const handleSearch = () => {
    fetchUniversityJobs(1);
  };

  // Clear filters
  const handleClearFilters = () => {
    setSearchKeywords("");
    setLocation("");
    setEmploymentType("");
    setTimeout(() => fetchUniversityJobs(1), 100);
  };

  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl mb-2 font-bold">University Jobs</h1>
          <p className="text-muted-foreground">
            Internships, entry-level positions, and campus opportunities
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Total Jobs</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
              <div className="h-12 w-12 rounded-xl bg-[#00B4D8]/10 flex items-center justify-center">
                <GraduationCap className="h-6 w-6 text-[#00B4D8]" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Handshake</p>
                <p className="text-2xl font-bold">{stats.handshake}</p>
              </div>
              <Badge variant="secondary" className="text-xs">Campus</Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">LinkedIn</p>
                <p className="text-2xl font-bold">{stats.linkedin}</p>
              </div>
              <Badge variant="secondary" className="text-xs">Internships</Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Other Sources</p>
                <p className="text-2xl font-bold">{stats.other}</p>
              </div>
              <Badge variant="secondary" className="text-xs">Entry-level</Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-6">
          <div className="grid md:grid-cols-4 gap-4">
            <div className="md:col-span-2">
              <Input
                placeholder="Search by keywords (e.g., software engineer, intern)..."
                value={searchKeywords}
                onChange={(e) => setSearchKeywords(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                className="w-full"
              />
            </div>

            <Input
              placeholder="Location"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            />

            <Select value={employmentType || "ALL"} onValueChange={(val) => setEmploymentType(val === "ALL" ? "" : val)}>
              <SelectTrigger>
                <SelectValue placeholder="Job Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Types</SelectItem>
                <SelectItem value="INTERNSHIP">Internship</SelectItem>
                <SelectItem value="FULL_TIME">Full-time</SelectItem>
                <SelectItem value="PART_TIME">Part-time</SelectItem>
                <SelectItem value="CONTRACT">Contract</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-2 mt-4">
            <Button onClick={handleSearch} className="flex items-center gap-2">
              <Search className="h-4 w-4" />
              Search
            </Button>
            <Button variant="outline" onClick={handleClearFilters}>
              Clear Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-[#00B4D8]" />
        </div>
      )}

      {/* Job Listings */}
      {!loading && jobs.length > 0 && (
        <div className="space-y-4">
          {jobs.map((job) => (
            <Card key={job._id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex gap-4 flex-1">
                    <div className="h-14 w-14 rounded-xl bg-gradient-to-br from-[#00B4D8]/10 to-[#0077B6]/10 flex items-center justify-center flex-shrink-0">
                      <GraduationCap className="h-6 w-6 text-[#00B4D8]" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-semibold mb-1">
                        {job.title}
                      </h3>

                      <div className="flex items-center gap-3 text-sm text-muted-foreground mb-3 flex-wrap">
                        <div className="flex items-center gap-1">
                          <Building2 className="h-4 w-4" />
                          {job.company}
                        </div>
                        {job.location && (
                          <div className="flex items-center gap-1">
                            <MapPin className="h-4 w-4" />
                            {job.location}
                          </div>
                        )}
                        <div className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          {formatDate(job.postedDate)}
                        </div>
                      </div>

                      <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                        {job.description}
                      </p>

                      <div className="flex flex-wrap gap-2">
                        <Badge variant="outline">{job.employmentType.replace('_', ' ')}</Badge>
                        <Badge variant="outline">{job.experienceLevel}</Badge>

                        {job.remote && (
                          <Badge variant="secondary" className="bg-green-100 text-green-700">
                            Remote
                          </Badge>
                        )}

                        {job.visaSponsorship.h1b && (
                          <Badge variant="secondary" className="bg-blue-100 text-blue-700">
                            H1B
                          </Badge>
                        )}

                        {job.visaSponsorship.opt && (
                          <Badge variant="secondary" className="bg-purple-100 text-purple-700">
                            OPT
                          </Badge>
                        )}

                        <Badge variant="secondary" className="bg-[#00B4D8]/10 text-[#00B4D8]">
                          {job.source}
                        </Badge>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2 flex-shrink-0">
                    {job.applicationUrl && (
                      <Button size="sm" onClick={() => window.open(job.applicationUrl, '_blank')}>
                        <ExternalLink className="h-4 w-4 mr-2" />
                        Apply
                      </Button>
                    )}
                    {job.sourceUrl && !job.applicationUrl && (
                      <Button size="sm" onClick={() => window.open(job.sourceUrl, '_blank')}>
                        <ExternalLink className="h-4 w-4 mr-2" />
                        View Job
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!loading && jobs.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center">
            <GraduationCap className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-xl font-semibold mb-2">No university jobs found</h3>
            <p className="text-muted-foreground mb-4">
              Try adjusting your filters or check back later for new opportunities
            </p>
            <Button onClick={handleClearFilters}>Clear Filters</Button>
          </CardContent>
        </Card>
      )}

      {/* Pagination */}
      {!loading && jobs.length > 0 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {((pagination.page - 1) * pagination.limit) + 1} to{' '}
            {Math.min(pagination.page * pagination.limit, pagination.total)} of{' '}
            {pagination.total} jobs
          </p>

          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={pagination.page === 1}
              onClick={() => fetchUniversityJobs(pagination.page - 1)}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={pagination.page >= pagination.pages}
              onClick={() => fetchUniversityJobs(pagination.page + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
