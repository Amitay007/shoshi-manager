import React from "react";
import { Button } from "@/components/ui/button";
import { ArrowRight, Home } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function BackHomeButtons({ className = "", backTo = null, backLabel = "חזור לעמוד הקודם", showHomeButton = true }) {
  const navigate = useNavigate();

  return (
    <div className={`flex gap-2 ${className}`}>
      {backTo ? (
        <Link to={createPageUrl(backTo)}>
          <Button variant="outline" className="gap-2">
            {backLabel} <ArrowRight className="w-4 h-4" />
          </Button>
        </Link>
      ) : (
        <Button variant="outline" className="gap-2" onClick={() => navigate(-1)}>
          {backLabel} <ArrowRight className="w-4 h-4" />
        </Button>
      )}
      {showHomeButton && (
        <Link to={createPageUrl("Home")}>
          <Button className="gap-2" variant="outline">
             <Home className="w-4 h-4" />
          </Button>
        </Link>
      )}
    </div>
  );
}