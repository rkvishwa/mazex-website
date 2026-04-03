"use client";

import { useState } from "react";
import Image, { ImageProps } from "next/image";

interface ImageWithSkeletonProps extends Omit<ImageProps, "onLoad"> {
  skeletonClassName?: string;
  containerClassName?: string;
  fill?: boolean;
}

export default function ImageWithSkeleton({
  skeletonClassName = "",
  containerClassName = "",
  className = "",
  fill = false,
  alt,
  ...props
}: ImageWithSkeletonProps) {
  const [isLoaded, setIsLoaded] = useState(false);

  // If fill is true, Next.js Image expects a relative parent. 
  // We apply h-full w-full to the container so it matches the parent's dimensions.
  const fillContainerClasses = fill ? "absolute inset-0 w-full h-full" : "relative w-max h-max";

  return (
    <div className={`${fillContainerClasses} ${containerClassName}`}>
      {!isLoaded && (
        <div
          className={`absolute inset-0 z-10 animate-pulse bg-gray-200/20 dark:bg-zinc-800/50 ${skeletonClassName}`}
        />
      )}
      <Image
        {...props}
        fill={fill}
        alt={alt || "Image"}
        className={`${className} transition-opacity duration-500 ease-in-out ${
          isLoaded ? "opacity-100" : "opacity-0"
        }`}
        onLoad={() => setIsLoaded(true)}
      />
    </div>
  );
}